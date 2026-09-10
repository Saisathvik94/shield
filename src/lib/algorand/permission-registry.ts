import algosdk from "algosdk";
import { createHash } from "crypto";
import {
  encodeNote,
  getAlgod,
  getNetwork,
  getTreasuryAccount,
  isAlgorandConfigured,
  waitConfirmed,
} from "./client";

const textEncoder = new TextEncoder();

/**
 * Box-backed permission registry. The deployed application is the authority
 * for asset access; PostgreSQL is only a local index of the same decisions.
 */
export const PERMISSION_APPROVAL_PROGRAM = `#pragma version 8

txn ApplicationID
int 0
==
bnz handle_create

txna ApplicationArgs 0
byte "grant"
==
bnz handle_grant

txna ApplicationArgs 0
byte "revoke"
==
bnz handle_revoke

err

handle_create:
txn Sender
byte "admin"
app_global_put
int 1
return

handle_grant:
txn Sender
byte "admin"
app_global_get
==
assert
txna ApplicationArgs 1
byte "1"
box_put
int 1
return

handle_revoke:
txn Sender
byte "admin"
app_global_get
==
assert
txna ApplicationArgs 1
box_del
pop
int 1
return
`;

export const PERMISSION_CLEAR_PROGRAM = `#pragma version 8
int 1
`;

export function getPermissionAppId(): number | null {
  const value = Number(process.env.ALGORAND_PERMISSION_APP_ID ?? "");
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function isPermissionRegistryConfigured(): boolean {
  return isAlgorandConfigured() && getPermissionAppId() !== null;
}

export function permissionBoxKey(assetDbId: string, walletAddress: string): Uint8Array {
  return createHash("sha256")
    .update(`asset-access:${assetDbId}:${walletAddress}`)
    .digest();
}

export async function hasOnChainAssetAccess(
  assetDbId: string,
  walletAddress: string
): Promise<boolean> {
  const appId = getPermissionAppId();
  if (!isPermissionRegistryConfigured() || !appId || !walletAddress) return false;

  try {
    await getAlgod().getApplicationBoxByName(appId, permissionBoxKey(assetDbId, walletAddress)).do();
    return true;
  } catch (error: unknown) {
    const status = (error as { response?: { statusCode?: number } })?.response?.statusCode;
    if (status === 404) return false;
    throw error;
  }
}

export async function setOnChainAssetAccess(opts: {
  assetDbId: string;
  walletAddress: string;
  organizationId: string;
  actorUserId: string;
  enabled: boolean;
}): Promise<{ txId: string; confirmedRound: string }> {
  const appId = getPermissionAppId();
  if (!isPermissionRegistryConfigured() || !appId) {
    throw new Error("On-chain permission registry is not configured.");
  }

  const algod = getAlgod();
  const treasury = getTreasuryAccount();
  const key = permissionBoxKey(opts.assetDbId, opts.walletAddress);
  const params = await algod.getTransactionParams().do();
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: treasury.addr,
    appIndex: appId,
    appArgs: [
      textEncoder.encode(opts.enabled ? "grant" : "revoke"),
      key,
    ],
    boxes: [{ appIndex: 0, name: key }],
    suggestedParams: params,
    note: encodeNote({
      op: opts.enabled ? "ACCESS_GRANTED" : "ACCESS_REVOKED",
      assetDbId: opts.assetDbId,
      walletAddress: opts.walletAddress,
      organizationId: opts.organizationId,
      actorUserId: opts.actorUserId,
      ts: Date.now(),
    }),
  });

  const signed = txn.signTxn(treasury.sk);
  const { txid } = await algod.sendRawTransaction(signed).do();
  const confirmation = await waitConfirmed(txid);
  const confirmedRound = String(confirmation.confirmedRound ?? "");

  return { txId: txid, confirmedRound };
}

export function permissionExplorerUrl(txId: string): string {
  const base = getNetwork() === "testnet"
    ? "https://testnet.explorer.perawallet.app"
    : "https://explorer.perawallet.app";
  return `${base}/tx/${txId}`;
}
