import { computeCanonicalSha256 } from "./canonicalize";

export interface ApprovalActionPayload {
  action: string;
  approvalRequestId: string;
  assetId?: string | null;
  assetVersion?: number;
  organizationId: string;
  requestedBy: string; // User ID or DID
  targetSubject?: string | null;
  currentCustodian?: string | null;
  requestedCustodian?: string | null;
  currentState?: string | null;
  expiresAt: string; // ISO 8601
  customParams?: Record<string, unknown>;
}

/**
 * Constructs a deterministic canonical action digest using RFC 8785 JCS + SHA-256.
 * This digest is the exact cryptographic payload that approvers sign with their wallet.
 */
export function computeActionDigest(payload: ApprovalActionPayload): {
  canonicalString: string;
  actionDigest: string;
} {
  // Normalize fields into a clean deterministic object
  const normalized = {
    action: payload.action,
    approvalRequestId: payload.approvalRequestId,
    assetId: payload.assetId ?? null,
    assetVersion: payload.assetVersion ?? 1,
    currentCustodian: payload.currentCustodian ?? null,
    currentState: payload.currentState ?? null,
    expiresAt: payload.expiresAt,
    organizationId: payload.organizationId,
    requestedBy: payload.requestedBy,
    requestedCustodian: payload.requestedCustodian ?? null,
    targetSubject: payload.targetSubject ?? null,
    customParams: payload.customParams ?? null,
  };

  const actionDigest = computeCanonicalSha256(normalized);
  return {
    canonicalString: JSON.stringify(normalized),
    actionDigest,
  };
}

/**
 * Formats the human-readable signing challenge presented to Pera Wallet.
 */
export function formatSignChallenge(actionDigest: string): string {
  return `SHIELD-APPROVAL:${actionDigest}`;
}
