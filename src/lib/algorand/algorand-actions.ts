"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assets, organizationMemberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditEvent } from "@/db/queries/audit";
import { isAlgorandConfigured } from "./client";
import { registerAssetOnChain, revokeAssetOnChain } from "./asset-registry";
import { anchorAuditEvent } from "./audit-anchor";

export type AlgorandActionResult =
  | { status: "success"; txId: string; algorandAssetId?: string; confirmedRound: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string };

// ─── Asset tokenisation ────────────────────────────────────────────────────

/**
 * Tokenise an existing SHIELD asset as an Algorand ASA.
 * Can be called from the asset passport UI by OWNER/ADMIN/MANAGER.
 */
export async function tokeniseAsset(
  assetDbId: string
): Promise<AlgorandActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  if (!isAlgorandConfigured()) {
    return {
      status: "skipped",
      reason: "Algorand is not configured. Add ALGORAND_TREASURY_MNEMONIC to your environment.",
    };
  }

  // Load asset + verify membership
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetDbId),
    with: { organization: true },
  });
  if (!asset) return { status: "error", message: "Asset not found." };

  if (asset.algorandAssetId) {
    return { status: "error", message: "Asset is already tokenised on Algorand." };
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

  try {
    const result = await registerAssetOnChain({
      assetDbId: asset.id,
      assetId: asset.assetId,
      name: asset.name,
      classification: asset.classification,
      organizationId: asset.organizationId,
      ownerUserId: session.user.id,
      ipfsCid: asset.ipfsCid ?? undefined,
    });

    if (!result) {
      return { status: "skipped", reason: "Algorand not configured." };
    }

    // Create + anchor the audit event
    const auditEvent = await createAuditEvent({
      organizationId: asset.organizationId,
      actorId: session.user.id,
      eventType: "ASSET_CREATED",
      resourceType: "asset",
      resourceId: assetDbId,
      blockchainTxId: result.txId,
      description: `Asset "${asset.assetId}" tokenised on Algorand - ASA #${result.algorandAssetId} (TX: ${result.txId})`,
    });

    // Anchor the audit event itself
    await anchorAuditEvent(auditEvent.id, {
      eventType: "ASSET_CREATED",
      resourceType: "asset",
      resourceId: assetDbId,
      actorId: session.user.id,
      organizationId: asset.organizationId,
    });

    revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);

    return {
      status: "success",
      txId: result.txId,
      algorandAssetId: result.algorandAssetId,
      confirmedRound: result.confirmedRound,
    };
  } catch (err) {
    console.error("[SHIELD] tokeniseAsset error:", err);
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Blockchain transaction failed.",
    };
  }
}

// ─── Asset revocation ──────────────────────────────────────────────────────

export async function revokeAsset(
  assetDbId: string,
  reason: string
): Promise<AlgorandActionResult> {
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
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Only OWNER or ADMIN can revoke assets." };
  }

  if (!isAlgorandConfigured() || !asset.algorandAssetId) {
    // Off-chain revocation only
    await db
      .update(assets)
      .set({ status: "REVOKED", updatedAt: new Date() })
      .where(eq(assets.id, assetDbId));

    await createAuditEvent({
      organizationId: asset.organizationId,
      actorId: session.user.id,
      eventType: "ASSET_REVOKED",
      resourceType: "asset",
      resourceId: assetDbId,
      description: `Asset "${asset.assetId}" revoked. Reason: ${reason}`,
    });

    revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
    return { status: "success", txId: "off-chain", confirmedRound: "n/a" };
  }

  try {
    // Look up the owner's wallet address separately
    const { walletIdentities } = await import("@/db/schema");
    const ownerWallet = asset.ownerId
      ? await db.query.walletIdentities.findFirst({
          where: eq(walletIdentities.userId, asset.ownerId),
        })
      : null;
    const holderAddress = ownerWallet?.walletAddress ?? "";

    const result = await revokeAssetOnChain({
      assetDbId,
      algorandAssetId: asset.algorandAssetId,
      holderAddress,
      organizationId: asset.organizationId,
      actorUserId: session.user.id,
      reason,
    });

    const auditEvent = await createAuditEvent({
      organizationId: asset.organizationId,
      actorId: session.user.id,
      eventType: "ASSET_REVOKED",
      resourceType: "asset",
      resourceId: assetDbId,
      blockchainTxId: result?.txId,
      description: `Asset "${asset.assetId}" revoked on-chain. Reason: ${reason}`,
    });

    if (result) {
      await anchorAuditEvent(auditEvent.id, {
        eventType: "ASSET_REVOKED",
        resourceType: "asset",
        resourceId: assetDbId,
        actorId: session.user.id,
        organizationId: asset.organizationId,
      });
    }

    revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
    return {
      status: "success",
      txId: result?.txId ?? "off-chain",
      confirmedRound: result?.confirmedRound ?? "n/a",
    };
  } catch (err) {
    console.error("[SHIELD] revokeAsset error:", err);
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Blockchain transaction failed.",
    };
  }
}

// ─── Generic audit anchor action ───────────────────────────────────────────

/**
 * Manually anchor an existing audit event on Algorand.
 * Available to OWNER/ADMIN from the audit trail page.
 */
export async function anchorEvent(
  auditEventId: string,
  organizationId: string
): Promise<AlgorandActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  if (!isAlgorandConfigured()) {
    return { status: "skipped", reason: "Algorand not configured." };
  }

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }

  const event = await db.query.auditEvents.findFirst({
    where: (e, { eq }) => eq(e.id, auditEventId),
  });
  if (!event) return { status: "error", message: "Audit event not found." };

  if (event.blockchainTxId) {
    return { status: "error", message: "Event is already anchored on-chain." };
  }

  try {
    const result = await anchorAuditEvent(auditEventId, {
      eventType: event.eventType,
      resourceType: event.resourceType ?? "unknown",
      resourceId: event.resourceId ?? auditEventId,
      actorId: session.user.id,
      organizationId,
      description: event.description ?? undefined,
      ipfsCid: event.ipfsCid ?? undefined,
    });

    if (!result) return { status: "skipped", reason: "Algorand not configured." };

    revalidatePath(`/dashboard/orgs/${organizationId}/audit`);
    return {
      status: "success",
      txId: result.txId,
      confirmedRound: result.confirmedRound,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Anchor failed.",
    };
  }
}
