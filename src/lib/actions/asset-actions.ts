"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assets, organizationMemberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditEvent } from "@/db/queries/audit";
import { isAlgorandConfigured } from "@/lib/algorand/client";
import { anchorAuditEvent } from "@/lib/algorand/audit-anchor";
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
  }
): Promise<AssetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const membership = await assertOrgAccess(organizationId, session.user.id);
  if (!membership) return { status: "error", message: "Access denied." };

  if (!data.assetId.trim() || !data.name.trim()) {
    return { status: "error", message: "Asset ID and name are required." };
  }

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
      ownerId: session.user.id,
      status: "REGISTERED",
    })
    .returning();

  const auditEvent = await createAuditEvent({
    organizationId,
    actorId: session.user.id,
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
      actorId: session.user.id,
      organizationId,
      description: auditEvent.description ?? undefined,
    }).catch((err) => console.error("[SHIELD] anchorAssetCreation error:", err));
  }

  revalidatePath(`/dashboard/orgs/${organizationId}/assets`);
  return { status: "success", assetId: asset.id };
}

export async function getOrgAssets(organizationId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership) return [];

  return db.query.assets.findMany({
    where: eq(assets.organizationId, organizationId),
    with: {
      owner: true,
      custodian: true,
      department: true,
    },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
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
