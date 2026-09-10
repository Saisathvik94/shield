/**
 * SHIELD Audit Anchor - Algorand layer
 *
 * Anchors critical audit events as immutable on-chain proofs.
 * Uses 0-ALGO self-payment with a structured note containing
 * the event hash, type, and metadata.
 *
 * For SIH demo this is a single-tx anchor. In production you would
 * batch many events into one tx using a Merkle root.
 */

import algosdk from "algosdk";
import { createHash } from "crypto";
import {
  getAlgod,
  getTreasuryAccount,
  waitConfirmed,
  encodeNote,
  getNetwork,
  isAlgorandConfigured,
} from "./client";
import { db } from "@/db";
import { auditEvents, blockchainRecords } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AuditAnchorResult {
  txId: string;
  confirmedRound: string;
  eventHash: string;
  network: string;
}

/**
 * Anchor a single audit event on Algorand.
 * Updates the auditEvent record with blockchainTxId.
 *
 * @param auditEventId  - DB ID of the audit event to anchor
 * @param payload       - The event data (must be deterministic)
 */
export async function anchorAuditEvent(
  auditEventId: string,
  payload: {
    eventType: string;
    resourceType: string;
    resourceId: string;
    actorId?: string;
    organizationId?: string;
    description?: string;
    ipfsCid?: string;
  }
): Promise<AuditAnchorResult | null> {
  if (!isAlgorandConfigured()) return null;

  const algod = getAlgod();
  const treasury = getTreasuryAccount();
  const network = getNetwork();

  // Deterministic SHA-256 of the event payload
  const eventHash = createHash("sha256")
    .update(JSON.stringify({ auditEventId, ...payload, ts: auditEventId }))
    .digest("hex");

  const note = encodeNote({
    op: "AUDIT_ANCHOR",
    auditEventId,
    eventType: payload.eventType,
    eventHash,
    resourceType: payload.resourceType,
    resourceId: payload.resourceId,
    orgId: payload.organizationId ?? null,
    ipfsCid: payload.ipfsCid ?? null,
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
  const confirmedRound = String(confirmation.confirmedRound ?? "");

  // Update the audit event with blockchain proof
  await db
    .update(auditEvents)
    .set({ blockchainTxId: txid })
    .where(eq(auditEvents.id, auditEventId));

  // Persist the blockchain record
  await db.insert(blockchainRecords).values({
    txId: txid,
    confirmedRound,
    recordType: "AUDIT_ANCHOR",
    resourceType: payload.resourceType,
    resourceId: payload.resourceId,
    organizationId: payload.organizationId ?? null,
    actorId: payload.actorId ?? null,
    notePayload: new TextDecoder().decode(note),
    network,
  });

  return { txId: txid, confirmedRound, eventHash, network };
}

/**
 * Anchor a role assignment on-chain.
 */
export async function anchorRoleAssignment(opts: {
  auditEventId: string;
  targetUserId: string;
  role: string;
  organizationId: string;
  actorUserId: string;
}): Promise<AuditAnchorResult | null> {
  return anchorAuditEvent(opts.auditEventId, {
    eventType: "ROLE_ASSIGNED",
    resourceType: "membership",
    resourceId: opts.targetUserId,
    actorId: opts.actorUserId,
    organizationId: opts.organizationId,
    description: `Role ${opts.role} assigned to user ${opts.targetUserId}`,
  });
}

/**
 * Anchor an organization registration on-chain.
 */
export async function anchorOrgRegistration(opts: {
  auditEventId: string;
  organizationId: string;
  orgName: string;
  actorUserId: string;
}): Promise<AuditAnchorResult | null> {
  return anchorAuditEvent(opts.auditEventId, {
    eventType: "ORG_CREATED",
    resourceType: "organization",
    resourceId: opts.organizationId,
    actorId: opts.actorUserId,
    organizationId: opts.organizationId,
    description: `Organization "${opts.orgName}" created`,
  });
}
