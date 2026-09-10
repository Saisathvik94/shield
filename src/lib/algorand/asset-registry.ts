/**
 * SHIELD Asset Registry - Algorand layer (algosdk v3)
 *
 * Each registered asset is tokenised as an Algorand Standard Asset (ASA).
 * - 1 indivisible unit (total = 1, decimals = 0) - represents uniqueness
 * - algosdk v3 uses camelCase fields throughout
 * - clawbackTarget replaces revocationTarget for clawback transfers
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
import { assets, blockchainRecords } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AssetRegistrationResult {
  txId: string;
  algorandAssetId: string;
  confirmedRound: string;
  network: string;
}

export async function registerAssetOnChain(opts: {
  assetDbId: string;
  assetId: string;
  name: string;
  classification: string;
  organizationId: string;
  ownerUserId: string;
  ipfsCid?: string;
}): Promise<AssetRegistrationResult | null> {
  if (!isAlgorandConfigured()) return null;

  const algod = getAlgod();
  const treasury = getTreasuryAccount();
  const network = getNetwork();

  const note = encodeNote({
    op: "ASSET_CREATION",
    standard: "arc69",
    assetDbId: opts.assetDbId,
    assetId: opts.assetId,
    classification: opts.classification,
    orgId: opts.organizationId,
    ipfsCid: opts.ipfsCid ?? null,
    ts: Date.now(),
  });

  const assetUrl = opts.ipfsCid
    ? `ipfs://${opts.ipfsCid}#arc3`
    : `https://shield.app/assets/${opts.assetDbId}`;

  const sp = await algod.getTransactionParams().do();

  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: treasury.addr,
    suggestedParams: sp,
    defaultFrozen: false,
    unitName: opts.assetId.slice(0, 8),
    assetName: opts.name.slice(0, 32),
    manager: treasury.addr,
    reserve: treasury.addr,
    freeze: treasury.addr,
    clawback: treasury.addr,
    assetURL: assetUrl,
    total: 1,
    decimals: 0,
    note,
  });

  const signed = txn.signTxn(treasury.sk);
  const { txid } = await algod.sendRawTransaction(signed).do();
  const confirmation = await waitConfirmed(txid);

  // algosdk v3: camelCase fields on PendingTransactionResponse
  const confirmedRound = String(confirmation.confirmedRound ?? "");
  const algorandAssetId = String(confirmation.assetIndex ?? "");

  await db
    .update(assets)
    .set({ algorandAssetId, blockchainTxId: txid, status: "ACTIVE", updatedAt: new Date() })
    .where(eq(assets.id, opts.assetDbId));

  await db.insert(blockchainRecords).values({
    txId: txid,
    confirmedRound,
    recordType: "ASSET_CREATION",
    resourceType: "asset",
    resourceId: opts.assetDbId,
    organizationId: opts.organizationId,
    actorId: opts.ownerUserId,
    algorandAssetId,
    notePayload: new TextDecoder().decode(note),
    network,
  });

  return { txId: txid, algorandAssetId, confirmedRound, network };
}

export async function transferAssetOnChain(opts: {
  assetDbId: string;
  algorandAssetId: string;
  fromAddress: string;
  toAddress: string;
  organizationId: string;
  actorUserId: string;
  reason?: string;
}): Promise<{ txId: string; confirmedRound: string } | null> {
  if (!isAlgorandConfigured()) return null;

  const algod = getAlgod();
  const treasury = getTreasuryAccount();
  const network = getNetwork();

  const note = encodeNote({
    op: "ASSET_TRANSFER",
    assetDbId: opts.assetDbId,
    algorandAssetId: opts.algorandAssetId,
    from: opts.fromAddress,
    to: opts.toAddress,
    reason: opts.reason ?? "",
    ts: Date.now(),
  });

  const sp = await algod.getTransactionParams().do();

  // algosdk v3: clawbackTarget instead of revocationTarget
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: treasury.addr,
    receiver: opts.toAddress,
    assetIndex: Number(opts.algorandAssetId),
    amount: 1,
    assetSender: opts.fromAddress,
    suggestedParams: sp,
    note,
  });

  const signed = txn.signTxn(treasury.sk);
  const { txid } = await algod.sendRawTransaction(signed).do();
  const confirmation = await waitConfirmed(txid);
  const confirmedRound = String(confirmation.confirmedRound ?? "");

  await db.insert(blockchainRecords).values({
    txId: txid,
    confirmedRound,
    recordType: "ASSET_TRANSFER",
    resourceType: "asset",
    resourceId: opts.assetDbId,
    organizationId: opts.organizationId,
    actorId: opts.actorUserId,
    algorandAssetId: opts.algorandAssetId,
    notePayload: new TextDecoder().decode(note),
    network,
  });

  return { txId: txid, confirmedRound };
}

export async function revokeAssetOnChain(opts: {
  assetDbId: string;
  algorandAssetId: string;
  holderAddress: string;
  organizationId: string;
  actorUserId: string;
  reason: string;
}): Promise<{ txId: string; confirmedRound: string } | null> {
  if (!isAlgorandConfigured()) return null;

  const algod = getAlgod();
  const treasury = getTreasuryAccount();
  const network = getNetwork();

  const note = encodeNote({
    op: "ASSET_REVOCATION",
    assetDbId: opts.assetDbId,
    algorandAssetId: opts.algorandAssetId,
    from: opts.holderAddress,
    reason: opts.reason,
    ts: Date.now(),
  });

  const sp = await algod.getTransactionParams().do();

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: treasury.addr,
    receiver: treasury.addr,
    assetIndex: Number(opts.algorandAssetId),
    amount: 1,
    assetSender: opts.holderAddress,
    suggestedParams: sp,
    note,
  });

  const signed = txn.signTxn(treasury.sk);
  const { txid } = await algod.sendRawTransaction(signed).do();
  const confirmation = await waitConfirmed(txid);
  const confirmedRound = String(confirmation.confirmedRound ?? "");

  await db
    .update(assets)
    .set({ status: "REVOKED", updatedAt: new Date() })
    .where(eq(assets.id, opts.assetDbId));

  await db.insert(blockchainRecords).values({
    txId: txid,
    confirmedRound,
    recordType: "ASSET_REVOCATION",
    resourceType: "asset",
    resourceId: opts.assetDbId,
    organizationId: opts.organizationId,
    actorId: opts.actorUserId,
    algorandAssetId: opts.algorandAssetId,
    notePayload: new TextDecoder().decode(note),
    network,
  });

  return { txId: txid, confirmedRound };
}
