"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assets, organizationMemberships, walletIdentities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditEvent } from "@/db/queries/audit";
import { isAlgorandConfigured } from "@/lib/algorand/client";
import { transferAssetOnChain } from "@/lib/algorand/asset-registry";
import { anchorAuditEvent } from "@/lib/algorand/audit-anchor";

export type TransferActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

/** Request a transfer - sets status to TRANSFER_REQUESTED, logs reason */
export async function requestTransfer(
  assetDbId: string,
  toUserId: string,
  reason: string
): Promise<TransferActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetDbId),
  });
  if (!asset) return { status: "error", message: "Asset not found." };

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, asset.organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership) return { status: "error", message: "Access denied." };

  // Only current custodian or owner can request transfer
  if (
    asset.custodianId !== session.user.id &&
    asset.ownerId !== session.user.id &&
    !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)
  ) {
    return { status: "error", message: "Only the asset owner, custodian, or manager can request a transfer." };
  }

  if (asset.status === "REVOKED" || asset.status === "RETIRED") {
    return { status: "error", message: "Cannot transfer a revoked or retired asset." };
  }

  // Store transfer target in metadata field
  const meta = JSON.stringify({ transferToUserId: toUserId, transferReason: reason });

  await db
    .update(assets)
    .set({ status: "TRANSFER_REQUESTED", metadata: meta, updatedAt: new Date() })
    .where(eq(assets.id, assetDbId));

  const auditEvent = await createAuditEvent({
    organizationId: asset.organizationId,
    actorId: session.user.id,
    eventType: "ASSET_TRANSFER_REQUESTED",
    resourceType: "asset",
    resourceId: assetDbId,
    description: `Transfer requested for asset "${asset.assetId}" - Reason: ${reason}`,
  });

  if (isAlgorandConfigured()) {
    anchorAuditEvent(auditEvent.id, {
      eventType: "ASSET_TRANSFER_REQUESTED",
      resourceType: "asset",
      resourceId: assetDbId,
      actorId: session.user.id,
      organizationId: asset.organizationId,
    }).catch(() => {});
  }

  revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
  return { status: "success" };
}

/** Approve a pending transfer - MANAGER/ADMIN/OWNER only */
export async function approveTransfer(
  assetDbId: string
): Promise<TransferActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetDbId),
  });
  if (!asset) return { status: "error", message: "Asset not found." };

  if (asset.status !== "TRANSFER_REQUESTED") {
    return { status: "error", message: "No pending transfer request for this asset." };
  }

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, asset.organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return { status: "error", message: "Only MANAGER, ADMIN, or OWNER can approve transfers." };
  }

  // Parse transfer target from metadata
  let toUserId = "";
  try {
    const meta = JSON.parse(asset.metadata ?? "{}");
    toUserId = meta.transferToUserId ?? "";
  } catch {
    return { status: "error", message: "Invalid transfer metadata." };
  }

  if (!toUserId) return { status: "error", message: "No transfer target found." };

  // Look up wallet addresses for on-chain transfer
  const fromWallet = asset.custodianId
    ? await db.query.walletIdentities.findFirst({
        where: eq(walletIdentities.userId, asset.custodianId),
      })
    : null;
  const toWallet = await db.query.walletIdentities.findFirst({
    where: eq(walletIdentities.userId, toUserId),
  });

  // Update DB: new custodian, status TRANSFERRED
  await db
    .update(assets)
    .set({
      custodianId: toUserId,
      status: "TRANSFERRED",
      metadata: null,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetDbId));

  const auditEvent = await createAuditEvent({
    organizationId: asset.organizationId,
    actorId: session.user.id,
    eventType: "ASSET_TRANSFERRED",
    resourceType: "asset",
    resourceId: assetDbId,
    description: `Transfer of asset "${asset.assetId}" approved and completed`,
  });

  // On-chain transfer if asset is tokenised
  if (
    isAlgorandConfigured() &&
    asset.algorandAssetId &&
    fromWallet?.walletAddress &&
    toWallet?.walletAddress
  ) {
    transferAssetOnChain({
      assetDbId,
      algorandAssetId: asset.algorandAssetId,
      fromAddress: fromWallet.walletAddress,
      toAddress: toWallet.walletAddress,
      organizationId: asset.organizationId,
      actorUserId: session.user.id,
      reason: "Approved transfer",
    }).catch(() => {});
  }

  if (isAlgorandConfigured()) {
    anchorAuditEvent(auditEvent.id, {
      eventType: "ASSET_TRANSFERRED",
      resourceType: "asset",
      resourceId: assetDbId,
      actorId: session.user.id,
      organizationId: asset.organizationId,
    }).catch(() => {});
  }

  revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
  return { status: "success" };
}

/** Reject a pending transfer request */
export async function rejectTransfer(
  assetDbId: string,
  reason: string
): Promise<TransferActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetDbId),
  });
  if (!asset || asset.status !== "TRANSFER_REQUESTED") {
    return { status: "error", message: "No pending transfer to reject." };
  }

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, asset.organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }

  await db
    .update(assets)
    .set({ status: "ACTIVE", metadata: null, updatedAt: new Date() })
    .where(eq(assets.id, assetDbId));

  await createAuditEvent({
    organizationId: asset.organizationId,
    actorId: session.user.id,
    eventType: "ASSET_UPDATED",
    resourceType: "asset",
    resourceId: assetDbId,
    description: `Transfer request for asset "${asset.assetId}" rejected. Reason: ${reason}`,
  });

  revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
  return { status: "success" };
}

/** Retire an asset (end of life) */
export async function retireAsset(
  assetDbId: string,
  reason: string
): Promise<TransferActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetDbId) });
  if (!asset) return { status: "error", message: "Asset not found." };

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, asset.organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Only OWNER or ADMIN can retire assets." };
  }

  await db
    .update(assets)
    .set({ status: "RETIRED", updatedAt: new Date() })
    .where(eq(assets.id, assetDbId));

  await createAuditEvent({
    organizationId: asset.organizationId,
    actorId: session.user.id,
    eventType: "ASSET_RETIRED",
    resourceType: "asset",
    resourceId: assetDbId,
    description: `Asset "${asset.assetId}" retired. Reason: ${reason}`,
  });

  revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
  return { status: "success" };
}
