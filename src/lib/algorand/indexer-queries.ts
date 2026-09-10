/**
 * SHIELD Indexer Queries (algosdk v3)
 *
 * algosdk v3 uses camelCase throughout.
 * Note fields are Uint8Array - decode with TextDecoder.
 * Indexer v3 uses .limit() not .maxResults().
 */

import { getIndexer, decodeNote } from "./client";

export interface AssetOnChainInfo {
  assetId: string;
  name: string;
  unitName: string;
  total: number;
  decimals: number;
  creator: string;
  manager: string | null;
  freeze: string | null;
  clawback: string | null;
  url: string | null;
  createdAtRound: number | null;
  deleted: boolean;
}

export interface TxNotePayload {
  shield?: string;
  op?: string;
  [key: string]: unknown;
}

function decodeNoteField(note: unknown): TxNotePayload | null {
  if (!note) return null;
  try {
    // algosdk v3: note may be Uint8Array or base64 string depending on context
    let str: string;
    if (note instanceof Uint8Array) {
      str = new TextDecoder().decode(note);
    } else if (typeof note === "string") {
      // base64 from raw indexer JSON
      str = new TextDecoder().decode(
        Uint8Array.from(atob(note), (c) => c.charCodeAt(0))
      );
    } else {
      return null;
    }
    return JSON.parse(str) as TxNotePayload;
  } catch {
    return null;
  }
}

export async function getAssetInfo(
  algorandAssetId: string
): Promise<AssetOnChainInfo | null> {
  try {
    const indexer = getIndexer();
    const result = await indexer.lookupAssetByID(Number(algorandAssetId)).do();
    const a = result.asset;
    if (!a) return null;

    const params = a.params;
    return {
      assetId: String(a.index),
      name: params.name ?? "",
      unitName: params.unitName ?? "",
      total: Number(params.total ?? 0),
      decimals: Number(params.decimals ?? 0),
      creator: params.creator ?? "",
      manager: params.manager ?? null,
      freeze: params.freeze ?? null,
      clawback: params.clawback ?? null,
      url: params.url ?? null,
      createdAtRound: a.createdAtRound ? Number(a.createdAtRound) : null,
      deleted: Boolean(a.deleted),
    };
  } catch {
    return null;
  }
}

export async function getTxNote(txId: string): Promise<TxNotePayload | null> {
  try {
    const indexer = getIndexer();
    const result = await indexer.lookupTransactionByID(txId).do();
    const tx = result.transaction;
    if (!tx) return null;
    return decodeNoteField(tx.note) ?? { raw: decodeNote(tx.note as Uint8Array) };
  } catch {
    return null;
  }
}

export async function getShieldTxHistory(
  treasuryAddress: string,
  limit = 20
): Promise<Array<{ txId: string; round: number; note: TxNotePayload }>> {
  try {
    const indexer = getIndexer();
    const notePrefix = new Uint8Array(
      Array.from('{"shield"', (c) => c.charCodeAt(0))
    );
    const result = await indexer
      .searchForTransactions()
      .address(treasuryAddress)
      .notePrefix(notePrefix)
      .limit(limit)
      .do();

    return (result.transactions ?? []).map((tx) => ({
      txId: (tx.id ?? "") as string,
      round: Number((tx as unknown as { confirmedRound?: number }).confirmedRound ?? 0),
      note: decodeNoteField((tx as unknown as { note?: unknown }).note) ?? {},
    }));
  } catch {
    return [];
  }
}

export async function verifyIdentityOnChain(
  did: string
): Promise<{ txId: string; round: number; ts: number } | null> {
  try {
    const indexer = getIndexer();
    const notePrefix = new Uint8Array(
      Array.from('{"shield"', (c) => c.charCodeAt(0))
    );
    const result = await indexer
      .searchForTransactions()
      .notePrefix(notePrefix)
      .limit(100)
      .do();

    for (const tx of result.transactions ?? []) {
      const payload = decodeNoteField(
        (tx as { note?: unknown }).note
      );
      if (payload?.op === "IDENTITY_REGISTRATION" && payload?.did === did) {
        return {
          txId: (tx as { id: string }).id,
          round: Number((tx as { confirmedRound?: number }).confirmedRound ?? 0),
          ts: Number(payload.ts ?? 0),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyAssetOnChain(assetDbId: string): Promise<{
  txId: string;
  algorandAssetId: string;
  round: number;
  payload: TxNotePayload;
} | null> {
  try {
    const { db } = await import("@/db");
    const { blockchainRecords } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");

    const record = await db.query.blockchainRecords.findFirst({
      where: and(
        eq(blockchainRecords.resourceType, "asset"),
        eq(blockchainRecords.resourceId, assetDbId),
        eq(blockchainRecords.recordType, "ASSET_CREATION")
      ),
    });

    if (!record) return null;

    const indexer = getIndexer();
    const result = await indexer.lookupTransactionByID(record.txId).do();
    const tx = result.transaction;
    if (!tx) return null;

    const payload = decodeNoteField((tx as { note?: unknown }).note) ?? {};

    return {
      txId: record.txId,
      algorandAssetId: record.algorandAssetId ?? "",
      round: Number((tx as { confirmedRound?: number }).confirmedRound ?? 0),
      payload,
    };
  } catch {
    return null;
  }
}
