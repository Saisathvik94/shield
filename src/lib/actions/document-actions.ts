"use server";

import algosdk from "algosdk";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  assets,
  documentVersions,
  auditEvents,
  blockchainRecords,
  organizationMemberships,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { getPinata, ipfsGatewayUrl } from "@/lib/ipfs/pinata-client";
import {
  getAlgod,
  getTreasuryAccount,
  waitConfirmed,
  encodeNote,
  getNetwork,
  isAlgorandConfigured,
} from "@/lib/algorand/client";
import {
  verifyDocumentVersionIntegrity,
  DocumentIntegrityResult,
} from "@/lib/verification/document-verifier";
import { revalidatePath } from "next/cache";

export async function uploadDocumentVersionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required" };
  }

  const file = formData.get("file") as File | null;
  const assetId = formData.get("assetId") as string | null;
  const organizationId = formData.get("organizationId") as string | null;
  const changeReason = (formData.get("changeReason") as string | null) || "Initial version upload";
  const customDocumentId = formData.get("documentId") as string | null;

  if (!file || !assetId || !organizationId) {
    return { success: false, error: "Missing required fields: file, assetId, organizationId" };
  }

  // Verify membership
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });

  if (!membership || !["OWNER", "ADMIN", "MANAGER", "USER"].includes(membership.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const documentId = customDocumentId || file.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

  // Find existing versions for this document & asset
  const existingVersions = await db.query.documentVersions.findMany({
    where: and(
      eq(documentVersions.assetId, assetId),
      eq(documentVersions.documentId, documentId)
    ),
    orderBy: [desc(documentVersions.versionNumber)],
  });

  const nextVersionNumber = existingVersions.length > 0 ? existingVersions[0].versionNumber + 1 : 1;

  // Compute SHA-256
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sha256Hash = createHash("sha256").update(buffer).digest("hex");

  // Upload to Pinata / IPFS
  let ipfsCid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  try {
    const pinata = getPinata();
    const uploadFile = new File([arrayBuffer], file.name, { type: file.type });
    const groupId = process.env.PINATA_GROUP_ID || undefined;
    const uploadResult = await pinata.upload.public.file(uploadFile).group(groupId ?? "").name(
      `shield-asset-${assetId}-v${nextVersionNumber}-${file.name}`
    );
    ipfsCid = uploadResult.cid;
  } catch (err) {
    console.warn("Pinata upload fallback to deterministic CID hash:", err);
    ipfsCid = `bafy${sha256Hash.substring(0, 48)}`;
  }

  // Anchor to Algorand
  let blockchainTxId: string | null = null;
  if (isAlgorandConfigured()) {
    try {
      const algod = getAlgod();
      const treasury = getTreasuryAccount();
      const network = getNetwork();

      const note = encodeNote({
        op: "DOCUMENT_VERSION_CREATED",
        assetId,
        docId: documentId,
        v: nextVersionNumber,
        hash: sha256Hash,
        cid: ipfsCid,
        orgId: organizationId,
        ts: Date.now(),
      });

      const sp = await algod.getTransactionParams().do();
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: treasury.addr,
        receiver: treasury.addr,
        amount: 0,
        note,
        suggestedParams: sp,
      });

      const signed = txn.signTxn(treasury.sk);
      const { txid } = await algod.sendRawTransaction(signed).do();
      const confirmation = await waitConfirmed(txid);
      blockchainTxId = txid;

      await db.insert(blockchainRecords).values({
        txId: txid,
        confirmedRound: String(confirmation.confirmedRound ?? ""),
        recordType: "AUDIT_ANCHOR",
        resourceType: "document_version",
        resourceId: `${assetId}:${documentId}:v${nextVersionNumber}`,
        organizationId,
        actorId: session.user.id,
        notePayload: new TextDecoder().decode(note),
        network,
      });
    } catch (err) {
      console.error("Blockchain anchor error for document version:", err);
    }
  }

  // Atomic update: set isCurrent = false for previous versions of this doc
  await db
    .update(documentVersions)
    .set({ isCurrent: false, updatedAt: new Date() })
    .where(
      and(
        eq(documentVersions.assetId, assetId),
        eq(documentVersions.documentId, documentId)
      )
    );

  // Insert new version
  const [createdVersion] = await db
    .insert(documentVersions)
    .values({
      documentId,
      assetId,
      organizationId,
      versionNumber: nextVersionNumber,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      sha256Hash,
      ipfsCid,
      uploadedById: session.user.id,
      changeReason,
      isCurrent: true,
      blockchainTxId,
      uploadedAt: new Date(),
    })
    .returning();

  // Update asset ipfsCid
  await db
    .update(assets)
    .set({ ipfsCid, updatedAt: new Date() })
    .where(eq(assets.id, assetId));

  // Audit log
  await db.insert(auditEvents).values({
    organizationId,
    actorId: session.user.id,
    eventType: "DOCUMENT_VERSION_CREATED",
    resourceType: "document_version",
    resourceId: createdVersion.id,
    description: `Uploaded version v${nextVersionNumber} of document "${file.name}" for asset (SHA-256: ${sha256Hash.slice(0, 12)}...)`,
    blockchainTxId,
    ipfsCid,
    metadata: JSON.stringify({
      assetId,
      documentId,
      versionNumber: nextVersionNumber,
      fileName: file.name,
      fileSize: file.size,
      changeReason,
      sha256Hash,
    }),
  });

  revalidatePath(`/dashboard/orgs/${organizationId}/assets/${assetId}`);
  revalidatePath(`/verify/${assetId}`);

  return {
    success: true,
    version: createdVersion,
  };
}

export async function getDocumentVersionsAction(assetId: string) {
  const versions = await db.query.documentVersions.findMany({
    where: eq(documentVersions.assetId, assetId),
    orderBy: [desc(documentVersions.versionNumber)],
    with: {
      uploadedBy: true,
    },
  });

  return { success: true, data: versions };
}

export async function verifyDocumentIntegrityAction(
  documentVersionId: string,
  formData?: FormData
): Promise<DocumentIntegrityResult> {
  const session = await auth();
  let buffer: Buffer | undefined = undefined;

  if (formData) {
    const file = formData.get("file") as File | null;
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
  }

  return verifyDocumentVersionIntegrity(documentVersionId, buffer, session?.user?.id ?? undefined);
}

export async function simulateDocumentTamperAction(
  documentVersionId: string,
  tamperedSha256: string = "badf00d0000000000000000000000000000000000000000000000000000badf0"
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required" };
  }

  const existing = await db.query.documentVersions.findFirst({
    where: eq(documentVersions.id, documentVersionId),
  });

  if (!existing) {
    return { success: false, error: "Document version not found" };
  }

  // Update hash to tampered value to simulate tampering
  const [updated] = await db
    .update(documentVersions)
    .set({
      sha256Hash: tamperedSha256,
      updatedAt: new Date(),
    })
    .where(eq(documentVersions.id, documentVersionId))
    .returning();

  await db.insert(auditEvents).values({
    organizationId: existing.organizationId,
    actorId: session.user.id,
    eventType: "DOCUMENT_INTEGRITY_FAILED",
    resourceType: "document_version",
    resourceId: existing.id,
    description: `SIMULATED TAMPERING APPLIED: SHA-256 altered for document "${existing.fileName}" v${existing.versionNumber}`,
    metadata: JSON.stringify({
      originalHash: existing.sha256Hash,
      tamperedHash: tamperedSha256,
    }),
  });

  revalidatePath(`/dashboard/orgs/${existing.organizationId}/assets/${existing.assetId}`);
  revalidatePath(`/verify/${existing.assetId}`);

  return { success: true, updated };
}
