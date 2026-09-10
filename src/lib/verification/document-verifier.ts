import { db } from "@/db";
import { documentVersions, auditEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeSha256 } from "@/lib/crypto/canonicalize";

export interface DocumentIntegrityResult {
  valid: boolean;
  tamperDetected: boolean;
  versionNumber: number;
  fileName: string;
  expectedSha256: string;
  calculatedSha256?: string;
  ipfsCid: string;
  blockchainTxId?: string | null;
  uploadedAt: string;
  changeReason?: string | null;
  error?: string;
}

/**
 * Verify integrity of a document version against a provided file buffer or hash.
 */
export async function verifyDocumentVersionIntegrity(
  documentVersionId: string,
  providedBuffer?: Buffer | Uint8Array,
  actorId?: string
): Promise<DocumentIntegrityResult> {
  const version = await db.query.documentVersions.findFirst({
    where: eq(documentVersions.id, documentVersionId),
  });

  if (!version) {
    return {
      valid: false,
      tamperDetected: false,
      versionNumber: 0,
      fileName: "",
      expectedSha256: "",
      ipfsCid: "",
      uploadedAt: new Date().toISOString(),
      error: "Document version record not found",
    };
  }

  let calculatedSha256: string | undefined = undefined;
  let tamperDetected = false;
  let valid = true;

  if (providedBuffer) {
    calculatedSha256 = computeSha256(providedBuffer);
    if (calculatedSha256 !== version.sha256Hash) {
      tamperDetected = true;
      valid = false;
    }
  }

  // Audit event
  try {
    if (tamperDetected) {
      await db.insert(auditEvents).values({
        organizationId: version.organizationId,
        actorId: actorId ?? null,
        eventType: "DOCUMENT_INTEGRITY_FAILED",
        resourceType: "document_version",
        resourceId: version.id,
        description: `TAMPER DETECTED on document "${version.fileName}" v${version.versionNumber}: hash mismatch.`,
        blockchainTxId: version.blockchainTxId,
        metadata: JSON.stringify({
          expectedSha256: version.sha256Hash,
          calculatedSha256,
          ipfsCid: version.ipfsCid,
          versionNumber: version.versionNumber,
        }),
      });
    } else {
      await db.insert(auditEvents).values({
        organizationId: version.organizationId,
        actorId: actorId ?? null,
        eventType: "DOCUMENT_VERSION_VERIFIED",
        resourceType: "document_version",
        resourceId: version.id,
        description: `Verified integrity of document "${version.fileName}" v${version.versionNumber} successfully.`,
        blockchainTxId: version.blockchainTxId,
        metadata: JSON.stringify({
          sha256Hash: version.sha256Hash,
          ipfsCid: version.ipfsCid,
          versionNumber: version.versionNumber,
        }),
      });
    }
  } catch (err) {
    console.error("Audit log error on document verification:", err);
  }

  return {
    valid,
    tamperDetected,
    versionNumber: version.versionNumber,
    fileName: version.fileName,
    expectedSha256: version.sha256Hash,
    calculatedSha256,
    ipfsCid: version.ipfsCid,
    blockchainTxId: version.blockchainTxId,
    uploadedAt: version.uploadedAt.toISOString(),
    changeReason: version.changeReason,
    error: tamperDetected ? "SHA-256 integrity check failed: file contents have been tampered with or corrupted" : undefined,
  };
}
