import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function syncEnums() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const auditEvents = [
    "USER_CREATED",
    "USER_WALLET_LINKED",
    "USER_LOGIN",
    "ORG_CREATED",
    "ORG_UPDATED",
    "MEMBER_INVITED",
    "MEMBER_JOINED",
    "MEMBER_REMOVED",
    "ROLE_ASSIGNED",
    "ROLE_REVOKED",
    "ASSET_CREATED",
    "ASSET_UPDATED",
    "ASSET_ASSIGNED",
    "ASSET_TRANSFER_REQUESTED",
    "ASSET_TRANSFERRED",
    "ASSET_REVOKED",
    "ASSET_RETIRED",
    "ACCESS_GRANTED",
    "ACCESS_REVOKED",
    "ACCESS_DENIED",
    "BLOCKCHAIN_TX",
    "IPFS_UPLOAD",
    "CREDENTIAL_ISSUED",
    "CREDENTIAL_REVOKED",
    "CREDENTIAL_VERIFIED",
    "DOCUMENT_VERSION_CREATED",
    "DOCUMENT_VERSION_VERIFIED",
    "DOCUMENT_INTEGRITY_FAILED",
    "DOCUMENT_DOWNLOADED",
    "ASSET_VERIFICATION_PERFORMED",
    "APPROVAL_POLICY_CREATED",
    "APPROVAL_POLICY_UPDATED",
    "APPROVAL_REQUEST_CREATED",
    "APPROVAL_SIGNED",
    "APPROVAL_REJECTED",
    "APPROVAL_EXPIRED",
    "APPROVAL_QUORUM_REACHED",
    "APPROVAL_EXECUTED",
    "APPROVAL_INVALIDATED",
    "APPROVAL_CANCELLED",
    "RISK_EVALUATED"
  ];

  for (const val of auditEvents) {
    try {
      await pool.query(`ALTER TYPE "audit_event_type" ADD VALUE IF NOT EXISTS '${val}';`);
    } catch (e: any) {
      // ignore
    }
  }

  console.log("All audit_event_type enum values synchronized.");
  await pool.end();
}

syncEnums();
