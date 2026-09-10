import { db } from "@/db";
import { credentials, auditEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeCanonicalSha256 } from "@/lib/crypto/canonicalize";
import type {
  CompleteVerifiableCredential,
  CredentialVerificationResult,
  CredentialStatus,
} from "@/lib/credential/types";

export async function verifyVerifiableCredential(
  input: CompleteVerifiableCredential | { credentialId: string },
  opts: { logAudit?: boolean; verifierId?: string } = {}
): Promise<CredentialVerificationResult> {
  const { logAudit = false, verifierId } = opts;

  let vc: CompleteVerifiableCredential;
  let dbRecord: typeof credentials.$inferSelect | null = null;

  if ("credentialId" in input) {
    const found = await db.query.credentials.findFirst({
      where: eq(credentials.id, input.credentialId),
    });
    if (!found) {
      return {
        valid: false,
        status: "REVOKED",
        checks: {
          hashValid: false,
          formatValid: false,
          notExpired: false,
          notRevoked: false,
          blockchainAnchored: false,
        },
        details: {
          calculatedHash: "",
          recordedHash: "",
          issuerDid: "",
          subjectDid: "",
          type: "ORGANIZATION_MEMBERSHIP",
          issuedAt: "",
        },
        error: "Credential not found in database",
      };
    }
    dbRecord = found;
    const claims = JSON.parse(found.claims);
    vc = {
      credential: {
        context: [
          "https://www.w3.org/2018/credentials/v1",
          "https://shield.trust/credentials/v1",
        ],
        id: `urn:uuid:${found.id}`,
        type: [found.type],
        issuer: {
          id: found.issuerDid,
          organizationId: found.organizationId,
        },
        issuanceDate: found.issuedAt.toISOString(),
        expirationDate: found.expiresAt ? found.expiresAt.toISOString() : null,
        credentialSubject: {
          id: found.subjectDid,
          claims,
        },
      },
      proof: {
        type: "ShieldCanonicalSha256Proof2026",
        created: found.issuedAt.toISOString(),
        verificationMethod: `${found.issuerDid}#key-1`,
        proofPurpose: "assertionMethod",
        jcsSha256Hash: found.credentialHash,
        blockchainTxId: found.blockchainTxId,
      },
    };
  } else {
    vc = input;
    const found = await db.query.credentials.findFirst({
      where: eq(credentials.credentialHash, vc.proof.jcsSha256Hash),
    });
    if (found) {
      dbRecord = found;
    }
  }

  const { credential, proof } = vc;

  // 1. Format validation
  const formatValid = Boolean(
    credential.id &&
    credential.type &&
    credential.type.length > 0 &&
    credential.issuer?.id &&
    credential.credentialSubject?.id &&
    (credential.issuer.id.startsWith("did:") || credential.issuer.id.length > 5) &&
    (credential.credentialSubject.id.startsWith("did:") || credential.credentialSubject.id.length > 5)
  );

  // 2. Hash calculation and comparison
  const calculatedHash = computeCanonicalSha256(credential);
  const hashValid = calculatedHash === proof.jcsSha256Hash;

  // 3. Expiration check
  const now = new Date();
  let notExpired = true;
  if (credential.expirationDate) {
    const expDate = new Date(credential.expirationDate);
    if (now > expDate) {
      notExpired = false;
    }
  }

  // 4. Revocation check
  let notRevoked = true;
  let status: CredentialStatus = "ACTIVE";
  let revokedAt: string | null = null;
  let revocationReason: string | null = null;

  if (dbRecord) {
    if (dbRecord.status === "REVOKED") {
      notRevoked = false;
      status = "REVOKED";
      revokedAt = dbRecord.revokedAt ? dbRecord.revokedAt.toISOString() : null;
      revocationReason = dbRecord.revocationReason;
    } else if (dbRecord.status === "SUSPENDED") {
      status = "SUSPENDED";
      notRevoked = false;
    }
  }

  if (!notExpired && status !== "REVOKED") {
    status = "EXPIRED";
  }

  // 5. Blockchain Anchor Check
  const blockchainAnchored = Boolean(
    proof.blockchainTxId || (dbRecord && dbRecord.blockchainTxId)
  );

  const valid = formatValid && hashValid && notExpired && notRevoked;

  const result: CredentialVerificationResult = {
    valid,
    status,
    checks: {
      hashValid,
      formatValid,
      notExpired,
      notRevoked,
      blockchainAnchored,
    },
    details: {
      calculatedHash,
      recordedHash: proof.jcsSha256Hash,
      issuerDid: credential.issuer.id,
      subjectDid: credential.credentialSubject.id,
      type: credential.type[0],
      issuedAt: credential.issuanceDate,
      expiresAt: credential.expirationDate,
      revokedAt,
      revocationReason,
      blockchainTxId: proof.blockchainTxId ?? dbRecord?.blockchainTxId,
    },
    error: !valid
      ? !formatValid
        ? "Invalid credential format or DID identifier"
        : !hashValid
        ? "Canonical hash mismatch - credential claims have been tampered with"
        : !notExpired
        ? "Credential has expired"
        : !notRevoked
        ? `Credential was revoked: ${revocationReason || "No reason specified"}`
        : "Credential verification failed"
      : undefined,
  };

  if (logAudit && dbRecord) {
    try {
      await db.insert(auditEvents).values({
        organizationId: dbRecord.organizationId,
        actorId: verifierId ?? null,
        eventType: "CREDENTIAL_VERIFIED",
        resourceType: "credential",
        resourceId: dbRecord.id,
        description: `Verified ${dbRecord.type} credential for subject ${dbRecord.subjectDid} - Result: ${valid ? "VALID" : "INVALID"}`,
        blockchainTxId: dbRecord.blockchainTxId,
        metadata: JSON.stringify({
          valid,
          status,
          checks: result.checks,
          calculatedHash,
        }),
      });
    } catch (err) {
      console.error("Audit log error on credential verification:", err);
    }
  }

  return result;
}
