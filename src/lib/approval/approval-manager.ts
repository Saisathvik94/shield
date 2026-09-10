import algosdk from "algosdk";
import { db } from "@/db";
import {
  assets,
  approvalRequests,
  approvalSignatures,
  approvalPolicies,
  auditEvents,
  blockchainRecords,
  users,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { computeActionDigest, formatSignChallenge } from "@/lib/crypto/action-digest";
import { verifyApproverSignature } from "@/lib/crypto/signature-verifier";
import { resolveApprovalPolicy } from "./policy-evaluator";
import {
  getAlgod,
  getTreasuryAccount,
  waitConfirmed,
  encodeNote,
  getNetwork,
  isAlgorandConfigured,
} from "@/lib/algorand/client";
import type { ApprovalAction, ApprovalStatus, ApprovalRequestDetail } from "./types";

export interface CreateApprovalRequestInput {
  organizationId: string;
  assetId?: string | null;
  action: ApprovalAction;
  requestedById: string;
  targetSubjectId?: string | null;
  requestedCustodianId?: string | null;
  customParams?: Record<string, unknown>;
}

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  const {
    organizationId,
    assetId,
    action,
    requestedById,
    targetSubjectId,
    requestedCustodianId,
    customParams,
  } = input;

  let currentAssetState: string | null = null;
  let currentCustodianId: string | null = null;
  let assetVersion = 1;
  let assetRecord: typeof assets.$inferSelect | null = null;

  if (assetId) {
    const found = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });
    if (!found) throw new Error("Asset not found");
    if (found.organizationId !== organizationId) {
      throw new Error("Asset does not belong to specified organization");
    }
    assetRecord = found;
    currentAssetState = found.status;
    currentCustodianId = found.custodianId;
  }

  // Resolve Policy
  const policy = await resolveApprovalPolicy({
    organizationId,
    action,
    assetId,
    assetClassification: assetRecord?.classification,
  });

  const expiresAt = new Date(Date.now() + policy.approvalExpiryHours * 60 * 60 * 1000);
  const approvalRequestId = crypto.randomUUID();

  // Compute canonical action digest
  const { canonicalString, actionDigest } = computeActionDigest({
    action,
    approvalRequestId: `urn:uuid:${approvalRequestId}`,
    assetId,
    assetVersion,
    organizationId,
    requestedBy: requestedById,
    targetSubject: targetSubjectId,
    currentCustodian: currentCustodianId,
    requestedCustodian: requestedCustodianId,
    currentState: currentAssetState,
    expiresAt: expiresAt.toISOString(),
    customParams,
  });

  // Insert request
  const [createdRequest] = await db
    .insert(approvalRequests)
    .values({
      id: approvalRequestId,
      organizationId,
      assetId: assetId ?? null,
      action,
      policyId: policy.policyId ?? null,
      requestedById,
      targetSubjectId: targetSubjectId ?? null,
      currentAssetState,
      currentCustodianId,
      requestedCustodianId: requestedCustodianId ?? null,
      assetVersion,
      actionPayload: canonicalString,
      actionDigest,
      requiredApprovals: policy.requiredApprovals,
      status: "PENDING",
      expiresAt,
    })
    .returning();

  // Update asset status if transfer is requested
  if (assetId && action === "ASSET_TRANSFER") {
    await db
      .update(assets)
      .set({
        status: "TRANSFER_REQUESTED",
        updatedAt: new Date(),
        metadata: JSON.stringify({
          transferToUserId: requestedCustodianId,
          transferReason: customParams?.reason || "Multi-party transfer requested",
          approvalRequestId,
        }),
      })
      .where(eq(assets.id, assetId));
  }

  // Audit event
  await db.insert(auditEvents).values({
    organizationId,
    actorId: requestedById,
    eventType: "APPROVAL_REQUEST_CREATED",
    resourceType: "approval_request",
    resourceId: createdRequest.id,
    description: `Initiated multi-party approval request for ${action} (Quorum required: ${policy.requiredApprovals})`,
    metadata: JSON.stringify({
      approvalRequestId: createdRequest.id,
      action,
      assetId,
      actionDigest,
      requiredApprovals: policy.requiredApprovals,
      expiresAt: expiresAt.toISOString(),
    }),
  });

  return createdRequest;
}

export async function signApprovalRequest(opts: {
  approvalRequestId: string;
  walletAddress: string;
  signatureHex: string;
  actionDigest: string;
  userId?: string;
}) {
  const { approvalRequestId, walletAddress, signatureHex, actionDigest, userId } = opts;

  // 1. Verify signature & eligibility
  const validation = await verifyApproverSignature({
    approvalRequestId,
    walletAddress,
    signatureHex,
    actionDigest,
    userId,
  });

  if (!validation.valid || !validation.signerUser) {
    throw new Error(validation.error || "Signature validation failed");
  }

  const signer = validation.signerUser;

  // 2. Fetch request and check for Stale Asset State Protection
  const request = await db.query.approvalRequests.findFirst({
    where: eq(approvalRequests.id, approvalRequestId),
    with: { asset: true },
  });

  if (!request) throw new Error("Approval request not found");

  if (request.assetId && request.asset) {
    // If action is ASSET_TRANSFER, asset status was set to TRANSFER_REQUESTED upon request creation.
    // If status has transitioned away to REVOKED, RETIRED, or anything else unexpected, it is STALE.
    if (request.action === "ASSET_TRANSFER") {
      if (request.asset.status !== "TRANSFER_REQUESTED" && request.asset.status !== request.currentAssetState) {
        await invalidateStaleApproval(request.id, "Underlying asset state changed since approval was created");
        throw new Error("STALE APPROVAL: The asset state has changed since this approval request was created. Request invalidated.");
      }
    } else {
      if (request.asset.status !== request.currentAssetState) {
        await invalidateStaleApproval(request.id, "Underlying asset state modified");
        throw new Error("STALE APPROVAL: Asset state modified since approval creation. Request invalidated.");
      }
    }
  }

  // 3. Record signature
  const [createdSig] = await db
    .insert(approvalSignatures)
    .values({
      approvalRequestId,
      approverId: signer.id,
      approverDid: signer.did || `did:shield:user:${signer.id}`,
      approverWallet: walletAddress,
      signature: signatureHex,
      actionDigest,
      signedAt: new Date(),
    })
    .returning();

  // Audit event
  await db.insert(auditEvents).values({
    organizationId: request.organizationId,
    actorId: signer.id,
    eventType: "APPROVAL_SIGNED",
    resourceType: "approval_request",
    resourceId: approvalRequestId,
    description: `Signed approval for request ${approvalRequestId} by ${signer.name} (${signer.role})`,
    metadata: JSON.stringify({
      approverId: signer.id,
      approverWallet: walletAddress,
      actionDigest,
      role: signer.role,
    }),
  });

  // 4. Check if Quorum is met and atomically finalize if ready
  const finalizeResult = await checkAndFinalizeQuorum(approvalRequestId, signer.id);

  return {
    signature: createdSig,
    finalized: finalizeResult.finalized,
    status: finalizeResult.status,
    quorumMet: finalizeResult.quorumMet,
    currentApprovals: finalizeResult.currentApprovals,
    requiredApprovals: request.requiredApprovals,
  };
}

export async function rejectApprovalRequest(opts: {
  approvalRequestId: string;
  userId: string;
  reason: string;
}) {
  const { approvalRequestId, userId, reason } = opts;

  const request = await db.query.approvalRequests.findFirst({
    where: eq(approvalRequests.id, approvalRequestId),
  });

  if (!request) throw new Error("Approval request not found");
  if (request.status !== "PENDING") {
    throw new Error(`Cannot reject request in '${request.status}' state`);
  }

  const [updated] = await db
    .update(approvalRequests)
    .set({
      status: "REJECTED",
      rejectionReason: reason,
      rejectedById: userId,
      finalizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(approvalRequests.id, approvalRequestId))
    .returning();

  // Revert asset state if transfer was pending
  if (request.assetId && request.action === "ASSET_TRANSFER") {
    await db
      .update(assets)
      .set({
        status: (request.currentAssetState as any) || "ASSIGNED",
        updatedAt: new Date(),
      })
      .where(eq(assets.id, request.assetId));
  }

  await db.insert(auditEvents).values({
    organizationId: request.organizationId,
    actorId: userId,
    eventType: "APPROVAL_REJECTED",
    resourceType: "approval_request",
    resourceId: approvalRequestId,
    description: `Approval request rejected: ${reason}`,
    metadata: JSON.stringify({
      rejectedById: userId,
      reason,
    }),
  });

  return updated;
}

export async function cancelApprovalRequest(opts: {
  approvalRequestId: string;
  userId: string;
}) {
  const { approvalRequestId, userId } = opts;

  const request = await db.query.approvalRequests.findFirst({
    where: eq(approvalRequests.id, approvalRequestId),
  });

  if (!request) throw new Error("Approval request not found");
  if (request.status !== "PENDING") {
    throw new Error(`Cannot cancel request in '${request.status}' state`);
  }

  const [updated] = await db
    .update(approvalRequests)
    .set({
      status: "CANCELLED",
      finalizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(approvalRequests.id, approvalRequestId))
    .returning();

  // Revert asset state
  if (request.assetId && request.action === "ASSET_TRANSFER") {
    await db
      .update(assets)
      .set({
        status: (request.currentAssetState as any) || "ASSIGNED",
        updatedAt: new Date(),
      })
      .where(eq(assets.id, request.assetId));
  }

  await db.insert(auditEvents).values({
    organizationId: request.organizationId,
    actorId: userId,
    eventType: "APPROVAL_CANCELLED",
    resourceType: "approval_request",
    resourceId: approvalRequestId,
    description: "Approval request cancelled by requester",
    metadata: JSON.stringify({ cancelledById: userId }),
  });

  return updated;
}

/**
 * Atomically checks if quorum is reached and executes the authorized action.
 * Anchors the multi-party consensus proof on Algorand TestNet.
 */
export async function checkAndFinalizeQuorum(
  approvalRequestId: string,
  actorId?: string
): Promise<{
  finalized: boolean;
  status: ApprovalStatus;
  quorumMet: boolean;
  currentApprovals: number;
  blockchainTxId?: string | null;
}> {
  const request = await db.query.approvalRequests.findFirst({
    where: eq(approvalRequests.id, approvalRequestId),
    with: {
      signatures: true,
      asset: true,
    },
  });

  if (!request) throw new Error("Approval request not found");

  const validSignatures = request.signatures;
  const currentApprovals = validSignatures.length;
  const quorumMet = currentApprovals >= request.requiredApprovals;

  if (request.status !== "PENDING") {
    return {
      finalized: request.status === "EXECUTED" || request.status === "QUORUM_REACHED",
      status: request.status,
      quorumMet,
      currentApprovals,
      blockchainTxId: request.blockchainTxId,
    };
  }

  // Check expiration
  if (new Date() > request.expiresAt) {
    await db
      .update(approvalRequests)
      .set({ status: "EXPIRED", finalizedAt: new Date(), updatedAt: new Date() })
      .where(eq(approvalRequests.id, approvalRequestId));

    await db.insert(auditEvents).values({
      organizationId: request.organizationId,
      eventType: "APPROVAL_EXPIRED",
      resourceType: "approval_request",
      resourceId: approvalRequestId,
      description: "Approval request expired before quorum was satisfied",
    });

    return {
      finalized: false,
      status: "EXPIRED",
      quorumMet: false,
      currentApprovals,
    };
  }

  if (!quorumMet) {
    return {
      finalized: false,
      status: "PENDING",
      quorumMet: false,
      currentApprovals,
    };
  }

  // Quorum reached -> Execute the approved action atomically!
  let blockchainTxId: string | null = null;
  let confirmedRound: string | null = null;

  // 1. Anchor Quorum Consensus on Algorand
  if (isAlgorandConfigured()) {
    try {
      const algod = getAlgod();
      const treasury = getTreasuryAccount();
      const network = getNetwork();

      const note = encodeNote({
        op: "APPROVAL_QUORUM_REACHED",
        appId: approvalRequestId,
        action: request.action,
        assetId: request.assetId ?? null,
        digest: request.actionDigest,
        approvers: validSignatures.map((s) => s.approverWallet),
        approvalsCount: currentApprovals,
        requiredApprovals: request.requiredApprovals,
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
      confirmedRound = String(confirmation.confirmedRound ?? "");

      await db.insert(blockchainRecords).values({
        txId: txid,
        confirmedRound,
        recordType: "AUDIT_ANCHOR",
        resourceType: "approval_request",
        resourceId: approvalRequestId,
        organizationId: request.organizationId,
        actorId: actorId ?? null,
        notePayload: new TextDecoder().decode(note),
        network,
      });
    } catch (err) {
      console.error("[SHIELD] Algorand anchor error for approval quorum:", err);
    }
  }

  // 2. Execute underlying asset state update
  if (request.assetId) {
    if (request.action === "ASSET_TRANSFER" && request.requestedCustodianId) {
      await db
        .update(assets)
        .set({
          custodianId: request.requestedCustodianId,
          status: "TRANSFERRED",
          blockchainTxId: blockchainTxId ?? request.asset?.blockchainTxId,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, request.assetId));

      await db.insert(auditEvents).values({
        organizationId: request.organizationId,
        actorId: actorId ?? null,
        eventType: "ASSET_TRANSFERRED",
        resourceType: "asset",
        resourceId: request.assetId,
        description: `Transferred custody of asset to ${request.requestedCustodianId} after ${currentApprovals}-of-${request.requiredApprovals} multi-party quorum approval`,
        blockchainTxId,
      });
    } else if (request.action === "ASSET_REVOKE") {
      await db
        .update(assets)
        .set({
          status: "REVOKED",
          blockchainTxId: blockchainTxId ?? request.asset?.blockchainTxId,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, request.assetId));

      await db.insert(auditEvents).values({
        organizationId: request.organizationId,
        actorId: actorId ?? null,
        eventType: "ASSET_REVOKED",
        resourceType: "asset",
        resourceId: request.assetId,
        description: `Revoked asset after multi-party quorum approval`,
        blockchainTxId,
      });
    } else if (request.action === "ASSET_RETIRE") {
      await db
        .update(assets)
        .set({
          status: "RETIRED",
          updatedAt: new Date(),
        })
        .where(eq(assets.id, request.assetId));

      await db.insert(auditEvents).values({
        organizationId: request.organizationId,
        actorId: actorId ?? null,
        eventType: "ASSET_RETIRED",
        resourceType: "asset",
        resourceId: request.assetId,
        description: `Retired asset after multi-party quorum approval`,
        blockchainTxId,
      });
    }
  }

  // 3. Mark approval request as EXECUTED
  await db
    .update(approvalRequests)
    .set({
      status: "EXECUTED",
      finalizedAt: new Date(),
      blockchainTxId,
      updatedAt: new Date(),
    })
    .where(eq(approvalRequests.id, approvalRequestId));

  // 4. Log Quorum & Execution Audit Events
  await db.insert(auditEvents).values({
    organizationId: request.organizationId,
    actorId: actorId ?? null,
    eventType: "APPROVAL_QUORUM_REACHED",
    resourceType: "approval_request",
    resourceId: approvalRequestId,
    description: `Multi-party quorum reached (${currentApprovals}/${request.requiredApprovals}) for action ${request.action}`,
    blockchainTxId,
    metadata: JSON.stringify({
      approvalRequestId,
      action: request.action,
      approversCount: currentApprovals,
      requiredApprovals: request.requiredApprovals,
      actionDigest: request.actionDigest,
    }),
  });

  await db.insert(auditEvents).values({
    organizationId: request.organizationId,
    actorId: actorId ?? null,
    eventType: "APPROVAL_EXECUTED",
    resourceType: "approval_request",
    resourceId: approvalRequestId,
    description: `Executed action ${request.action} on asset ${request.assetId ?? "general"}`,
    blockchainTxId,
  });

  return {
    finalized: true,
    status: "EXECUTED",
    quorumMet: true,
    currentApprovals,
    blockchainTxId,
  };
}

export async function invalidateStaleApproval(approvalRequestId: string, reason: string) {
  await db
    .update(approvalRequests)
    .set({
      status: "INVALIDATED",
      rejectionReason: reason,
      finalizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(approvalRequests.id, approvalRequestId));

  const req = await db.query.approvalRequests.findFirst({
    where: eq(approvalRequests.id, approvalRequestId),
  });

  if (req) {
    await db.insert(auditEvents).values({
      organizationId: req.organizationId,
      eventType: "APPROVAL_INVALIDATED",
      resourceType: "approval_request",
      resourceId: approvalRequestId,
      description: `Approval request invalidated due to state change: ${reason}`,
      metadata: JSON.stringify({ reason }),
    });
  }
}

export async function getApprovalRequestDetails(approvalRequestId: string): Promise<ApprovalRequestDetail | null> {
  const req = await db.query.approvalRequests.findFirst({
    where: eq(approvalRequests.id, approvalRequestId),
    with: {
      organization: true,
      asset: true,
      requestedBy: true,
      currentCustodian: true,
      requestedCustodian: true,
      rejectedBy: true,
      signatures: {
        with: {
          approver: true,
        },
      },
    },
  });

  if (!req) return null;

  return {
    id: req.id,
    organizationId: req.organizationId,
    assetId: req.assetId,
    action: req.action as ApprovalAction,
    policyId: req.policyId,
    requestedById: req.requestedById,
    targetSubjectId: req.targetSubjectId,
    currentAssetState: req.currentAssetState,
    currentCustodianId: req.currentCustodianId,
    requestedCustodianId: req.requestedCustodianId,
    assetVersion: req.assetVersion,
    actionPayload: req.actionPayload,
    actionDigest: req.actionDigest,
    requiredApprovals: req.requiredApprovals,
    status: req.status as ApprovalStatus,
    rejectionReason: req.rejectionReason,
    rejectedById: req.rejectedById,
    blockchainTxId: req.blockchainTxId,
    expiresAt: req.expiresAt.toISOString(),
    finalizedAt: req.finalizedAt?.toISOString() || null,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
    organization: req.organization ? { id: req.organization.id, name: req.organization.name } : null,
    asset: req.asset ? {
      id: req.asset.id,
      assetId: req.asset.assetId,
      name: req.asset.name,
      classification: req.asset.classification,
      status: req.asset.status,
    } : null,
    requestedBy: req.requestedBy ? { id: req.requestedBy.id, name: req.requestedBy.name, email: req.requestedBy.email } : null,
    currentCustodian: req.currentCustodian ? { id: req.currentCustodian.id, name: req.currentCustodian.name, email: req.currentCustodian.email } : null,
    requestedCustodian: req.requestedCustodian ? { id: req.requestedCustodian.id, name: req.requestedCustodian.name, email: req.requestedCustodian.email } : null,
    rejectedBy: req.rejectedBy ? { id: req.rejectedBy.id, name: req.rejectedBy.name } : null,
    signatures: req.signatures.map((s) => ({
      id: s.id,
      approverId: s.approverId,
      approverDid: s.approverDid,
      approverWallet: s.approverWallet,
      signature: s.signature,
      actionDigest: s.actionDigest,
      signedAt: s.signedAt.toISOString(),
      approver: s.approver ? { id: s.approver.id, name: s.approver.name, email: s.approver.email } : null,
    })),
  };
}

