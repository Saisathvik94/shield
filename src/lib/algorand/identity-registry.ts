/**
 * SHIELD Identity Registry - Algorand layer
 *
 * Every SHIELD identity is anchored on-chain as a 0-ALGO self-payment
 * carrying a structured note. This gives an immutable timestamp proof
 * that the identity existed at a known round.
 *
 * Note schema:
 * {
 *   shield: "1.0",
 *   op: "IDENTITY_REGISTRATION" | "IDENTITY_REVOCATION",
 *   did: "did:shield:<uuid>",
 *   wallet: "<algorand-address>",
 *   userId: "<shield-user-id>",
 *   ts: <unix-ms>
 * }
 */

import algosdk from "algosdk";
import {
  getAlgod,
  getTreasuryAccount,
  waitConfirmed,
  encodeNote,
  getNetwork,
  isAlgorandConfigured,
} from "./client";
import { db } from "@/db";
import { blockchainRecords } from "@/db/schema";

export interface IdentityRegistrationResult {
  txId: string;
  confirmedRound: string;
  network: string;
}

/**
 * Anchor a new SHIELD identity on Algorand.
 * Called after a user registers and links their wallet.
 */
export async function anchorIdentityRegistration(opts: {
  did: string;
  walletAddress: string;
  userId: string;
}): Promise<IdentityRegistrationResult | null> {
  if (!isAlgorandConfigured()) return null;

  const algod = getAlgod();
  const treasury = getTreasuryAccount();
  const network = getNetwork();

  const note = encodeNote({
    op: "IDENTITY_REGISTRATION",
    did: opts.did,
    wallet: opts.walletAddress,
    userId: opts.userId,
    ts: Date.now(),
  });

  const sp = await algod.getTransactionParams().do();

  // 0-ALGO self-payment (only pays min fee)
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

  // Persist the blockchain record
  await db.insert(blockchainRecords).values({
    txId: txid,
    confirmedRound,
    recordType: "IDENTITY_REGISTRATION",
    resourceType: "user",
    resourceId: opts.userId,
    actorId: opts.userId,
    notePayload: new TextDecoder().decode(note),
    network,
  });

  return { txId: txid, confirmedRound, network };
}

/**
 * Revoke (tombstone) an identity on-chain.
 */
export async function anchorIdentityRevocation(opts: {
  did: string;
  userId: string;
  reason: string;
}): Promise<IdentityRegistrationResult | null> {
  if (!isAlgorandConfigured()) return null;

  const algod = getAlgod();
  const treasury = getTreasuryAccount();
  const network = getNetwork();

  const note = encodeNote({
    op: "IDENTITY_REVOCATION",
    did: opts.did,
    userId: opts.userId,
    reason: opts.reason,
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

  await db.insert(blockchainRecords).values({
    txId: txid,
    confirmedRound,
    recordType: "IDENTITY_REVOCATION",
    resourceType: "user",
    resourceId: opts.userId,
    actorId: opts.userId,
    notePayload: new TextDecoder().decode(note),
    network,
  });

  return { txId: txid, confirmedRound, network };
}
