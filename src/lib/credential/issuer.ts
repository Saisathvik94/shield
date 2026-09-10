import algosdk from "algosdk";
import { db } from "@/db";
import { credentials, auditEvents, blockchainRecords } from "@/db/schema";
import { computeCanonicalSha256 } from "@/lib/crypto/canonicalize";
import {
  getAlgod,
  getTreasuryAccount,
  waitConfirmed,
  encodeNote,
  getNetwork,
  isAlgorandConfigured,
} from "@/lib/algorand/client";
import type {
  CredentialType,
  CredentialClaims,
  VerifiableCredentialPayload,
  CompleteVerifiableCredential,
} from "./types";

export interface IssueCredentialInput {
  type: CredentialType;
  issuerDid: string;
  subjectDid: string;
  organizationId: string;
  issuedById?: string;
  claims: CredentialClaims;
  expiresAt?: Date | null;
  anchorOnChain?: boolean;
}

export async function issueVerifiableCredential(input: IssueCredentialInput) {
  const {
    type,
    issuerDid,
    subjectDid,
    organizationId,
    issuedById,
    claims,
    expiresAt = null,
    anchorOnChain = true,
  } = input;

  const issuanceDate = new Date().toISOString();
  const dbId = crypto.randomUUID();
  const credentialId = `urn:uuid:${dbId}`;

  const payload: VerifiableCredentialPayload = {
    context: [
      "https://www.w3.org/2018/credentials/v1",
      "https://shield.trust/credentials/v1",
    ],
    id: credentialId,
    type: [type],
    issuer: {
      id: issuerDid,
      organizationId,
    },
    issuanceDate,
    expirationDate: expiresAt ? expiresAt.toISOString() : null,
    credentialSubject: {
      id: subjectDid,
      claims,
    },
  };

  const credentialHash = computeCanonicalSha256(payload);

  let blockchainTxId: string | null = null;
  let confirmedRound: string | null = null;

  if (anchorOnChain && isAlgorandConfigured()) {
    try {
      const algod = getAlgod();
      const treasury = getTreasuryAccount();
      const network = getNetwork();

      const note = encodeNote({
        op: "CREDENTIAL_ISSUED",
        credId: credentialId,
        type,
        credHash: credentialHash,
        issuer: issuerDid,
        subject: subjectDid,
        orgId: organizationId,
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
        recordType: "IDENTITY_REGISTRATION",
        resourceType: "credential",
        resourceId: credentialId,
        organizationId,
        actorId: issuedById ?? null,
        notePayload: new TextDecoder().decode(note),
        network,
      });
    } catch (err) {
      console.error("Failed to anchor credential to Algorand:", err);
    }
  }

  // Insert into DB
  const [createdCredential] = await db
    .insert(credentials)
    .values({
      id: dbId,
      type,
      issuerDid,
      subjectDid,
      organizationId,
      issuedById: issuedById ?? null,
      claims: JSON.stringify(claims),
      status: "ACTIVE",
      credentialHash,
      signature: null,
      blockchainTxId,
      issuedAt: new Date(issuanceDate),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      revokedAt: null,
      revocationReason: null,
    })
    .returning();

  // Audit event
  await db.insert(auditEvents).values({
    organizationId,
    actorId: issuedById ?? null,
    eventType: "CREDENTIAL_ISSUED",
    resourceType: "credential",
    resourceId: createdCredential.id,
    description: `Issued ${type} verifiable credential to ${subjectDid}`,
    blockchainTxId,
    metadata: JSON.stringify({
      credentialId,
      type,
      credentialHash,
      subjectDid,
      issuerDid,
    }),
  });

  const completeVc: CompleteVerifiableCredential = {
    credential: payload,
    proof: {
      type: "ShieldCanonicalSha256Proof2026",
      created: issuanceDate,
      verificationMethod: `${issuerDid}#key-1`,
      proofPurpose: "assertionMethod",
      jcsSha256Hash: credentialHash,
      blockchainTxId,
    },
  };

  return {
    credentialRecord: createdCredential,
    verifiableCredential: completeVc,
  };
}
