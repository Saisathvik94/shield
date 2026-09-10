import algosdk from "algosdk";
import { db } from "@/db";
import { credentials, auditEvents, blockchainRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getAlgod,
  getTreasuryAccount,
  waitConfirmed,
  encodeNote,
  getNetwork,
  isAlgorandConfigured,
} from "@/lib/algorand/client";

export interface RevokeCredentialInput {
  credentialId: string;
  reason: string;
  revokedById?: string;
  anchorOnChain?: boolean;
}

export async function revokeVerifiableCredential(input: RevokeCredentialInput) {
  const { credentialId, reason, revokedById, anchorOnChain = true } = input;

  const existing = await db.query.credentials.findFirst({
    where: eq(credentials.id, credentialId),
  });

  if (!existing) {
    throw new Error("Credential not found");
  }

  if (existing.status === "REVOKED") {
    return existing;
  }

  const revokedAt = new Date();
  let revocationTxId: string | null = null;

  if (anchorOnChain && isAlgorandConfigured()) {
    try {
      const algod = getAlgod();
      const treasury = getTreasuryAccount();
      const network = getNetwork();

      const note = encodeNote({
        op: "CREDENTIAL_REVOKED",
        credId: existing.id,
        credHash: existing.credentialHash,
        type: existing.type,
        reason,
        issuer: existing.issuerDid,
        subject: existing.subjectDid,
        orgId: existing.organizationId,
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
      revocationTxId = txid;

      await db.insert(blockchainRecords).values({
        txId: txid,
        confirmedRound: String(confirmation.confirmedRound ?? ""),
        recordType: "IDENTITY_REVOCATION",
        resourceType: "credential",
        resourceId: existing.id,
        organizationId: existing.organizationId,
        actorId: revokedById ?? null,
        notePayload: new TextDecoder().decode(note),
        network,
      });
    } catch (err) {
      console.error("Failed to anchor revocation to Algorand:", err);
    }
  }

  const [updated] = await db
    .update(credentials)
    .set({
      status: "REVOKED",
      revokedAt,
      revocationReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(credentials.id, credentialId))
    .returning();

  await db.insert(auditEvents).values({
    organizationId: existing.organizationId,
    actorId: revokedById ?? null,
    eventType: "CREDENTIAL_REVOKED",
    resourceType: "credential",
    resourceId: existing.id,
    description: `Revoked ${existing.type} credential for subject ${existing.subjectDid}: ${reason}`,
    blockchainTxId: revocationTxId ?? existing.blockchainTxId,
    metadata: JSON.stringify({
      credentialId: existing.id,
      credentialHash: existing.credentialHash,
      reason,
      revokedAt: revokedAt.toISOString(),
      revocationTxId,
    }),
  });

  return updated;
}
