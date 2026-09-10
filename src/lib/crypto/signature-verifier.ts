import algosdk from "algosdk";
import { db } from "@/db";
import {
  users,
  walletIdentities,
  organizationMemberships,
  approvalRequests,
  approvalSignatures,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { formatSignChallenge } from "./action-digest";

export interface VerifySignatureInput {
  approvalRequestId: string;
  walletAddress: string;
  signatureHex: string; // Hex string from pera.signData or algosdk.signBytes
  actionDigest: string;
  userId?: string;
}

export interface SignatureValidationResult {
  valid: boolean;
  signerUser?: {
    id: string;
    name: string;
    did: string | null;
    role: string;
  };
  error?: string;
}

/**
 * Cryptographically verifies an approver wallet signature against the canonical action digest
 * and enforces strict authorization, tenant membership, and anti-replay policies.
 */
export async function verifyApproverSignature(
  input: VerifySignatureInput
): Promise<SignatureValidationResult> {
  const { approvalRequestId, walletAddress, signatureHex, actionDigest, userId } = input;

  // 1. Fetch approval request with policy
  const request = await db.query.approvalRequests.findFirst({
    where: eq(approvalRequests.id, approvalRequestId),
    with: {
      policy: true,
      asset: true,
    },
  });

  if (!request) {
    return { valid: false, error: "Approval request not found" };
  }

  if (request.status !== "PENDING") {
    return { valid: false, error: `Approval request is no longer PENDING (status: ${request.status})` };
  }

  if (new Date() > request.expiresAt) {
    return { valid: false, error: "Approval request has expired" };
  }

  // 2. Action digest parity check
  if (request.actionDigest !== actionDigest) {
    return { valid: false, error: "Action digest mismatch - signed payload differs from request" };
  }

  // 3. Verify cryptographic Algorand signature
  const challenge = formatSignChallenge(actionDigest);
  const msgBytes = new TextEncoder().encode(challenge);
  const rawDigestBytes = new TextEncoder().encode(actionDigest);

  let sigValid = false;
  try {
    const sigBytes = Uint8Array.from(Buffer.from(signatureHex, "hex"));
    // Try challenge format first, fallback to raw digest bytes
    sigValid =
      algosdk.verifyBytes(msgBytes, sigBytes, walletAddress) ||
      algosdk.verifyBytes(rawDigestBytes, sigBytes, walletAddress);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SHIELD] Algorand verifyBytes error:", err);
    return { valid: false, error: `Cryptographic signature verification failed: ${msg}` };
  }

  if (!sigValid) {
    return { valid: false, error: "Invalid cryptographic signature for Algorand wallet address" };
  }

  // 4. Resolve user identity associated with wallet
  const walletRecord = await db.query.walletIdentities.findFirst({
    where: eq(walletIdentities.walletAddress, walletAddress),
    with: { user: true },
  });

  let resolvedUser = walletRecord?.user ?? null;

  if (!resolvedUser && userId) {
    const userById = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (userById) resolvedUser = userById;
  }

  if (!resolvedUser) {
    return { valid: false, error: "Wallet address is not linked to any registered user in SHIELD" };
  }

  // 5. Check organization membership and role standing
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, request.organizationId),
      eq(organizationMemberships.userId, resolvedUser.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });

  if (!membership) {
    return { valid: false, error: "Signer is not an active member of this organization" };
  }

  // 6. Check policy role eligibility
  if (request.policy) {
    const eligibleRoles: string[] = JSON.parse(request.policy.eligibleRoles || "[]");
    if (eligibleRoles.length > 0 && !eligibleRoles.includes(membership.role)) {
      return {
        valid: false,
        error: `Role '${membership.role}' is not authorized to approve this action (eligible: ${eligibleRoles.join(", ")})`,
      };
    }

    if (request.policy.eligibleUserIds) {
      const eligibleUsers: string[] = JSON.parse(request.policy.eligibleUserIds || "[]");
      if (eligibleUsers.length > 0 && !eligibleUsers.includes(resolvedUser.id)) {
        return { valid: false, error: "User is not in the explicit list of eligible approvers" };
      }
    }

    // 7. No self-approval check
    if (!request.policy.allowSelfApproval && request.requestedById === resolvedUser.id) {
      return { valid: false, error: "Self-approval is prohibited: requester cannot satisfy their own quorum" };
    }
  } else {
    // Default: requester cannot approve unless manager/admin
    if (request.requestedById === resolvedUser.id && !["OWNER", "ADMIN"].includes(membership.role)) {
      return { valid: false, error: "Requester cannot satisfy their own approval quorum" };
    }
  }

  // 8. Prevent duplicate signatures from the same identity
  const existingSig = await db.query.approvalSignatures.findFirst({
    where: and(
      eq(approvalSignatures.approvalRequestId, approvalRequestId),
      eq(approvalSignatures.approverId, resolvedUser.id)
    ),
  });

  if (existingSig) {
    return { valid: false, error: "Approver has already submitted a signature for this request" };
  }

  return {
    valid: true,
    signerUser: {
      id: resolvedUser.id,
      name: resolvedUser.name,
      did: resolvedUser.did,
      role: membership.role,
    },
  };
}
