"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assets, ipfsObjects, organizationMemberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditEvent } from "@/db/queries/audit";
import { getPinata, ipfsGatewayUrl } from "./pinata-client";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";

export type IpfsUploadResult =
  | {
      status: "success";
      cid: string;
      gatewayUrl: string;
      fileId: string;
      sha256: string;
    }
  | { status: "error"; message: string };

/**
 * Upload a file (from a FormData file field) to IPFS via Pinata.
 * Associates the upload with an asset when assetDbId is provided.
 */
export async function uploadAssetDocument(
  formData: FormData,
  organizationId: string,
  assetDbId?: string
): Promise<IpfsUploadResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  // Verify membership
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
  if (!membership || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }

  const file = formData.get("file") as File | null;
  if (!file) return { status: "error", message: "No file provided." };

  // Size limit: 50 MB
  if (file.size > 50 * 1024 * 1024) {
    return { status: "error", message: "File size must be 50 MB or less." };
  }

  // Compute SHA-256 for integrity verification
  const arrayBuffer = await file.arrayBuffer();
  const sha256 = createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");

  try {
    const pinata = getPinata();

    // Build a clean File object with metadata
    const uploadFile = new File([arrayBuffer], file.name, { type: file.type });

    const groupId = process.env.PINATA_GROUP_ID || undefined;

    const result = await pinata.upload.public.file(uploadFile).group(groupId ?? "").name(
      assetDbId ? `shield-asset-${assetDbId}-${file.name}` : `shield-org-${organizationId}-${file.name}`
    );

    const cid = result.cid;
    const gatewayUrl = ipfsGatewayUrl(cid);

    // Persist to DB
    const [ipfsObj] = await db
      .insert(ipfsObjects)
      .values({
        cid,
        pinataId: result.id,
        gatewayUrl,
        objectType: "ASSET_DOCUMENT",
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        sha256Hash: sha256,
        uploadedById: session.user.id,
        assetId: assetDbId ?? null,
        organizationId,
      })
      .returning();

    // If asset ID given, update asset's primary IPFS CID
    if (assetDbId) {
      await db
        .update(assets)
        .set({ ipfsCid: cid, updatedAt: new Date() })
        .where(eq(assets.id, assetDbId));
    }

    await createAuditEvent({
      organizationId,
      actorId: session.user.id,
      eventType: "IPFS_UPLOAD",
      resourceType: "asset",
      resourceId: assetDbId ?? organizationId,
      ipfsCid: cid,
      description: `File "${file.name}" (${formatBytes(file.size)}) uploaded to IPFS - CID: ${cid}`,
    });

    revalidatePath(`/dashboard/orgs/${organizationId}/assets`);

    return {
      status: "success",
      cid,
      gatewayUrl,
      fileId: ipfsObj.id,
      sha256,
    };
  } catch (err) {
    console.error("[SHIELD] IPFS upload error:", err);
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Upload failed. Check Pinata credentials.",
    };
  }
}

/**
 * Verify a file's integrity against a stored IPFS object.
 * Re-hashes the file and compares to the stored SHA-256.
 */
export async function verifyFileIntegrity(
  formData: FormData,
  cid: string
): Promise<
  | { status: "verified"; fileName: string; sha256: string }
  | { status: "tampered"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string }
> {
  const file = formData.get("file") as File | null;
  if (!file) return { status: "error", message: "No file provided." };

  // Look up the stored record
  const record = await db.query.ipfsObjects.findFirst({
    where: eq(ipfsObjects.cid, cid),
  });

  if (!record || !record.sha256Hash) {
    return { status: "not_found", message: "No integrity record found for this CID." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const computedHash = createHash("sha256")
    .update(Buffer.from(arrayBuffer))
    .digest("hex");

  if (computedHash === record.sha256Hash) {
    return { status: "verified", fileName: record.fileName ?? file.name, sha256: computedHash };
  }

  return {
    status: "tampered",
    message: `Hash mismatch. Expected ${record.sha256Hash.slice(0, 16)}… but got ${computedHash.slice(0, 16)}…`,
  };
}

/**
 * Get all IPFS objects for an asset.
 */
export async function getAssetDocuments(assetDbId: string) {
  return db.query.ipfsObjects.findMany({
    where: eq(ipfsObjects.assetId, assetDbId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: { uploadedBy: true },
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
