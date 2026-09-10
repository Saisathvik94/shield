import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function checkAndCreateTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Ensure enums exist
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "credential_type" AS ENUM('ORGANIZATION_MEMBERSHIP', 'ROLE_ASSIGNMENT', 'ASSET_AUTHORIZATION', 'AUDITOR_AUTHORIZATION');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "credential_status" AS ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Ensure credentials table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "credentials" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "type" "credential_type" NOT NULL,
      "issuer_did" text NOT NULL,
      "subject_did" text NOT NULL,
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "issued_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "claims" text NOT NULL,
      "status" "credential_status" DEFAULT 'ACTIVE' NOT NULL,
      "credential_hash" text NOT NULL,
      "signature" text,
      "blockchain_tx_id" text,
      "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
      "expires_at" timestamp with time zone,
      "revoked_at" timestamp with time zone,
      "revocation_reason" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  console.log("credentials table verified/created successfully.");
  await pool.end();
}

checkAndCreateTables();
