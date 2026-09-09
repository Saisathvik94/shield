import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { assets, organizationMemberships, auditEvents } from "@/db/schema";

/** Full asset detail including related entities */
export async function getAssetById(assetDbId: string, userId: string) {
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetDbId),
    with: {
      owner: true,
      custodian: true,
      department: true,
      section: true,
      organization: true,
      access: {
        with: {
          user: true,
          grantedBy: true,
        },
      },
    },
  });
  if (!asset) return null;

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, asset.organizationId),
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.status, "ACTIVE")
    ),
    with: { assignments: true },
  });
  if (!membership) return null;

  const canView = canViewAsset(asset, membership, userId);
  if (!canView) return null;

  return { asset, membership };
}

// Infer the type of the asset returned with relations
export type AssetWithRelations = NonNullable<
  Awaited<ReturnType<typeof getAssetById>>
>["asset"];

/** All IPFS objects attached to an asset */
export async function getAssetIpfsObjects(assetDbId: string) {
  const { ipfsObjects } = await import("@/db/schema");
  return db.query.ipfsObjects.findMany({
    where: eq(ipfsObjects.assetId, assetDbId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: { uploadedBy: true },
  });
}

/** Blockchain records for an asset */
export async function getAssetBlockchainRecords(assetDbId: string) {
  const { blockchainRecords } = await import("@/db/schema");
  return db.query.blockchainRecords.findMany({
    where: and(
      eq(blockchainRecords.resourceType, "asset"),
      eq(blockchainRecords.resourceId, assetDbId)
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: { actor: true },
  });
}

/** Recent audit events for a specific asset */
export async function getAssetAuditEvents(assetDbId: string, limit = 20) {
  return db.query.auditEvents.findMany({
    where: and(
      eq(auditEvents.resourceType, "asset"),
      eq(auditEvents.resourceId, assetDbId)
    ),
    orderBy: [desc(auditEvents.createdAt)],
    limit,
    with: { actor: true },
  });
}

function canViewAsset(
  asset: {
    organizationId: string;
    departmentId: string | null;
    ownerId: string | null;
    custodianId: string | null;
    access: { userId: string }[];
  },
  membership: {
    role: string;
    assignments: { departmentId: string | null }[];
  },
  userId: string
) {
  if (["OWNER", "ADMIN"].includes(membership.role)) return true;
  if (asset.ownerId === userId || asset.custodianId === userId) return true;
  if (asset.access.some((grant) => grant.userId === userId)) return true;
  if (!asset.departmentId) return true;

  return membership.assignments.some(
    (assignment) => assignment.departmentId === asset.departmentId
  );
}
