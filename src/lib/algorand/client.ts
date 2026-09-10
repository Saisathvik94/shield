import algosdk from "algosdk";

// ─── Algod client (transaction submission) ─────────────────────────────────

let _algod: algosdk.Algodv2 | null = null;

export function getAlgod(): algosdk.Algodv2 {
  if (_algod) return _algod;

  const url = process.env.ALGORAND_NODE_URL;
  const token = process.env.ALGORAND_NODE_TOKEN ?? "";

  if (!url) throw new Error("ALGORAND_NODE_URL environment variable is not set");

  _algod = new algosdk.Algodv2(token, url, "");
  return _algod;
}

// ─── Indexer client (read / query) ─────────────────────────────────────────

let _indexer: algosdk.Indexer | null = null;

export function getIndexer(): algosdk.Indexer {
  if (_indexer) return _indexer;

  const url = process.env.ALGORAND_INDEXER_URL;
  const token = process.env.ALGORAND_NODE_TOKEN ?? "";

  if (!url) throw new Error("ALGORAND_INDEXER_URL environment variable is not set");

  _indexer = new algosdk.Indexer(token, url, "");
  return _indexer;
}

// ─── Treasury / protocol account ───────────────────────────────────────────

export function getTreasuryAccount(): algosdk.Account {
  const mnemonic = process.env.ALGORAND_TREASURY_MNEMONIC;
  if (!mnemonic) {
    throw new Error("ALGORAND_TREASURY_MNEMONIC environment variable is not set");
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
}

/** Current Algorand network label */
export function getNetwork(): string {
  const url = process.env.ALGORAND_NODE_URL ?? "";
  return url.includes("testnet") ? "testnet" : "mainnet";
}

/**
 * Wait for a submitted transaction to be confirmed on-chain.
 * Returns the confirmed transaction info.
 */
export async function waitConfirmed(txId: string, maxRounds = 5) {
  const algod = getAlgod();
  return algosdk.waitForConfirmation(algod, txId, maxRounds);
}

/**
 * Encode a JSON-serialisable payload as a Uint8Array note field.
 * Max Algorand note size is 1024 bytes - we truncate gracefully.
 */
export function encodeNote(payload: Record<string, unknown>): Uint8Array {
  const json = JSON.stringify({ shield: "1.0", ...payload });
  const encoded = new TextEncoder().encode(json);
  // Algorand note field max = 1024 bytes
  return encoded.length <= 1024 ? encoded : encoded.slice(0, 1024);
}

/** Decode a note field back to a plain string */
export function decodeNote(note: Uint8Array): string {
  return new TextDecoder().decode(note);
}

/** Check whether Algorand env vars are configured */
export function isAlgorandConfigured(): boolean {
  return Boolean(
    process.env.ALGORAND_NODE_URL &&
    process.env.ALGORAND_TREASURY_MNEMONIC &&
    process.env.ALGORAND_TREASURY_MNEMONIC !== "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24 word25"
  );
}
