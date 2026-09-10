"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assets, assetAccess, organizationMemberships, walletIdentities } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createAuditEvent } from "@/db/queries/audit";
import { isAlgorandConfigured } from "@/lib/algorand/client";
import { anchorAuditEvent } from "@/lib/algorand/audit-anchor";
import {
  isPermissionRegistryConfigured,
  hasOnChainAssetAccess,
  setOnChainAssetAccess,
} from "@/lib/algorand/permission-registry";
import type { NewAsset } from "@/db/schema";

export type AssetActionResult =
  | { status: "success"; assetId: string }
  | { status: "error"; message: string };

async function assertOrgAccess(
  organizationId: string,
  userId: string,
  requiredRoles = ["OWNER", "ADMIN", "MANAGER"]
) {
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership) return null;
  if (!requiredRoles.includes(membership.role)) return null;
  return membership;
}

export async function createAsset(
  organizationId: string,
  data: {
    assetId: string;
    name: string;
    description?: string;
    assetType: NonNullable<NewAsset["assetType"]>;
    classification: NonNullable<NewAsset["classification"]>;
    departmentId?: string;
    location?: string;
    physicalIdentifier?: string;
    memberIds?: string[];
  }
): Promise<AssetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };
  const userId = session.user.id;

  const membership = await assertOrgAccess(organizationId, userId);
  if (!membership) return { status: "error", message: "Access denied." };

  if (!data.assetId.trim() || !data.name.trim()) {
    return { status: "error", message: "Asset ID and name are required." };
  }

  const memberIds = [...new Set((data.memberIds ?? []).filter(Boolean))]
    .filter((id) => id !== userId);

  const [asset] = await db
    .insert(assets)
    .values({
      organizationId,
      assetId: data.assetId.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      assetType: data.assetType,
      classification: data.classification,
      departmentId: data.departmentId || null,
      location: data.location?.trim() || null,
      physicalIdentifier: data.physicalIdentifier?.trim() || null,
      ownerId: userId,
      status: "REGISTERED",
    })
    .returning();

  // Grant explicit DB access to additional selected members
  if (memberIds.length > 0) {
    await db.insert(assetAccess).values(
      memberIds.map((selectedUserId) => ({
        assetId: asset.id,
        userId: selectedUserId,
        grantedById: userId,
      }))
    ).onConflictDoNothing();

    await Promise.all(
      memberIds.map((memberId) =>
        createAuditEvent({
          organizationId,
          actorId: userId,
          eventType: "ACCESS_GRANTED",
          resourceType: "asset_access",
          resourceId: `${asset.id}:${memberId}`,
          description: `Access granted for asset "${data.assetId}" to member ${memberId}`,
        })
      )
    );

    // Attempt on-chain grant if configured (non-blocking, non-fatal)
    if (isAlgorandConfigured()) {
      const wallets = await db.query.walletIdentities.findMany({
        where: inArray(walletIdentities.userId, [userId, ...memberIds]),
      });
      wallets.forEach((wallet) => {
        setOnChainAssetAccess({
          assetDbId: asset.id,
          walletAddress: wallet.walletAddress,
          organizationId,
          actorUserId: userId,
          enabled: true,
        }).catch(() => {});
      });
    }
  }

  const auditEvent = await createAuditEvent({
    organizationId,
    actorId: userId,
    eventType: "ASSET_CREATED",
    resourceType: "asset",
    resourceId: asset.id,
    description: `Asset "${data.assetId}" (${data.name}) registered - classification: ${data.classification}`,
  });

  // Anchor the registration event on Algorand (non-blocking)
  // CRITICAL and SECRET assets get auto-anchored immediately
  const shouldAutoAnchor =
    isAlgorandConfigured() &&
    ["CRITICAL", "SECRET", "CONFIDENTIAL"].includes(data.classification);

  if (shouldAutoAnchor) {
    anchorAuditEvent(auditEvent.id, {
      eventType: "ASSET_CREATED",
      resourceType: "asset",
      resourceId: asset.id,
      actorId: userId,
      organizationId,
      description: auditEvent.description ?? undefined,
    }).catch((err) => console.error("[SHIELD] anchorAssetCreation error:", err));
  }

  revalidatePath(`/dashboard/orgs/${organizationId}/assets`);
  return { status: "success", assetId: asset.id };
}

export async function getOrgAssets(organizationId: string, userId?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const effectiveUserId = userId ?? session.user.id;

  // Get the caller's membership and their department assignment
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, effectiveUserId),
      eq(organizationMemberships.status, "ACTIVE")
    ),
    with: { assignments: true },
  });
  if (!membership) return [];

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(membership.role);

  // Managers see all assets in the org
  if (isManager) {
    return db.query.assets.findMany({
      where: eq(assets.organizationId, organizationId),
      with: { owner: true, custodian: true, department: true },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });
  }

  // Non-managers: see assets where they are owner/custodian, OR
  // the asset is in their department, OR they have an explicit access grant
  const { assetAccess } = await import("@/db/schema");
  const { or } = await import("drizzle-orm");

  // Find the user's department from assignments
  const deptId = (membership.assignments as { departmentId?: string }[])?.[0]?.departmentId ?? null;

  // Get all org assets and filter in application layer (simpler than complex SQL OR)
  const allAssets = await db.query.assets.findMany({
    where: eq(assets.organizationId, organizationId),
    with: {
      owner: true,
      custodian: true,
      department: true,
      access: true,
    },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  return allAssets.filter((asset) => {
    // Owner or custodian always sees it
    if (asset.ownerId === effectiveUserId || asset.custodianId === effectiveUserId) return true;
    // Asset belongs to user's department
    if (deptId && asset.departmentId === deptId) return true;
    // Explicit access grant
    const access = asset.access as { userId: string }[] | undefined;
    if (access?.some((a) => a.userId === effectiveUserId)) return true;
    return false;
  });
}

/** Update asset custodian - creates an audit event and anchors if critical */
export async function assignCustodian(
  assetDbId: string,
  custodianUserId: string
): Promise<AssetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetDbId),
  });
  if (!asset) return { status: "error", message: "Asset not found." };

  const membership = await assertOrgAccess(asset.organizationId, session.user.id);
  if (!membership) return { status: "error", message: "Access denied." };

  await db
    .update(assets)
    .set({ custodianId: custodianUserId, status: "ASSIGNED", updatedAt: new Date() })
    .where(eq(assets.id, assetDbId));

  const auditEvent = await createAuditEvent({
    organizationId: asset.organizationId,
    actorId: session.user.id,
    eventType: "ASSET_ASSIGNED",
    resourceType: "asset",
    resourceId: assetDbId,
    description: `Asset "${asset.assetId}" custodian assigned`,
  });

  if (isAlgorandConfigured()) {
    anchorAuditEvent(auditEvent.id, {
      eventType: "ASSET_ASSIGNED",
      resourceType: "asset",
      resourceId: assetDbId,
      actorId: session.user.id,
      organizationId: asset.organizationId,
    }).catch((err) => console.error("[SHIELD] anchorAssign error:", err));
  }

  revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
  return { status: "success", assetId: assetDbId };
}

export async function grantAssetAccess(
  assetDbId: string,
  userId: string
): Promise<AssetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetDbId) });
  if (!asset) return { status: "error", message: "Asset not found." };
  const caller = await assertOrgAccess(asset.organizationId, session.user.id);
  if (!caller) return { status: "error", message: "Access denied." };

  const member = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, asset.organizationId),
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!member) return { status: "error", message: "Selected member is not active in this organization." };

  const wallet = await db.query.walletIdentities.findFirst({
    where: eq(walletIdentities.userId, userId),
  });
  if (!wallet) return { status: "error", message: "Selected member has no linked wallet." };

  // Attempt on-chain grant (non-fatal - DB record is the source of truth)
  if (isAlgorandConfigured()) {
    setOnChainAssetAccess({
      assetDbId,
      walletAddress: wallet.walletAddress,
      organizationId: asset.organizationId,
      actorUserId: session.user.id,
      enabled: true,
    }).catch(() => {});
  }

  await db.insert(assetAccess).values({ assetId: assetDbId, userId, grantedById: session.user.id }).onConflictDoNothing();
  const accessEvent = await createAuditEvent({
    organizationId: asset.organizationId,
    actorId: session.user.id,
    eventType: "ACCESS_GRANTED",
    resourceType: "asset_access",
    resourceId: `${assetDbId}:${userId}`,
    description: `Access granted for asset "${asset.assetId}" to member ${userId}`,
  });
  anchorAssetAccessEvent(accessEvent.id, {
    eventType: "ACCESS_GRANTED",
    assetDbId,
    targetUserId: userId,
    actorUserId: session.user.id,
    organizationId: asset.organizationId,
  });
  revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
  return { status: "success", assetId: assetDbId };
}

export async function revokeAssetAccess(
  assetDbId: string,
  userId: string
): Promise<AssetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetDbId) });
  if (!asset) return { status: "error", message: "Asset not found." };
  const caller = await assertOrgAccess(asset.organizationId, session.user.id);
  if (!caller) return { status: "error", message: "Access denied." };

  const wallet = await db.query.walletIdentities.findFirst({
    where: eq(walletIdentities.userId, userId),
  });
  if (!wallet) return { status: "error", message: "Selected member has no linked wallet." };

  // Attempt on-chain revoke (non-fatal)
  if (isAlgorandConfigured()) {
    setOnChainAssetAccess({
      assetDbId,
      walletAddress: wallet.walletAddress,
      organizationId: asset.organizationId,
      actorUserId: session.user.id,
      enabled: false,
    }).catch(() => {});
  }

  await db.delete(assetAccess).where(and(eq(assetAccess.assetId, assetDbId), eq(assetAccess.userId, userId)));
  const accessEvent = await createAuditEvent({
    organizationId: asset.organizationId,
    actorId: session.user.id,
    eventType: "ACCESS_REVOKED",
    resourceType: "asset_access",
    resourceId: `${assetDbId}:${userId}`,
    description: `Access revoked for asset "${asset.assetId}" for member ${userId}`,
  });
  anchorAssetAccessEvent(accessEvent.id, {
    eventType: "ACCESS_REVOKED",
    assetDbId,
    targetUserId: userId,
    actorUserId: session.user.id,
    organizationId: asset.organizationId,
  });
  revalidatePath(`/dashboard/orgs/${asset.organizationId}/assets/${assetDbId}`);
  return { status: "success", assetId: assetDbId };
}

function anchorAssetAccessEvent(
  auditEventId: string,
  data: {
    eventType: "ACCESS_GRANTED" | "ACCESS_REVOKED";
    assetDbId: string;
    targetUserId: string;
    actorUserId: string;
    organizationId: string;
  }
) {
  if (!isAlgorandConfigured()) return;

  anchorAuditEvent(auditEventId, {
    eventType: data.eventType,
    resourceType: "asset_access",
    resourceId: `${data.assetDbId}:${data.targetUserId}`,
    actorId: data.actorUserId,
    organizationId: data.organizationId,
    description: `${data.eventType} permission for asset ${data.assetDbId} to user ${data.targetUserId}`,
  }).catch((err) => {
    console.error("[SHIELD] anchorAssetAccessEvent error:", err);
  });
}
