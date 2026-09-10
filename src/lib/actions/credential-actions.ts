"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { credentials, organizations, organizationMemberships, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { issueVerifiableCredential } from "@/lib/credential/issuer";
import { revokeVerifiableCredential } from "@/lib/credential/revoker";
import { verifyVerifiableCredential } from "@/lib/verification/credential-verifier";
import type {
  CredentialType,
  CredentialClaims,
  CompleteVerifiableCredential,
  CredentialVerificationResult,
} from "@/lib/credential/types";
import { revalidatePath } from "next/cache";

export async function issueCredentialAction(data: {
  type: CredentialType;
  subjectDid: string;
  organizationId: string;
  claims: CredentialClaims;
  expiresAt?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required" };
  }

  // Verify caller membership & role
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, data.organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });

  if (!membership || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Insufficient permissions to issue credentials" };
  }

  // Get issuer DID (org or user DID)
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const issuerDid = user?.did || `did:shield:user:${session.user.id}`;

  try {
    const result = await issueVerifiableCredential({
      type: data.type,
      issuerDid,
      subjectDid: data.subjectDid,
      organizationId: data.organizationId,
      issuedById: session.user.id,
      claims: data.claims,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      anchorOnChain: true,
    });

    revalidatePath(`/dashboard/orgs/${data.organizationId}`);
    revalidatePath("/dashboard/credentials");

    return {
      success: true,
      credential: result.verifiableCredential,
      record: result.credentialRecord,
    };
  } catch (err: any) {
    console.error("Failed to issue credential:", err);
    return { success: false, error: err.message || "Failed to issue credential" };
  }
}

export async function revokeCredentialAction(data: {
  credentialId: string;
  reason: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required" };
  }

  const existing = await db.query.credentials.findFirst({
    where: eq(credentials.id, data.credentialId),
  });

  if (!existing) {
    return { success: false, error: "Credential not found" };
  }

  // Verify membership role
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, existing.organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });

  if (!membership || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Insufficient permissions to revoke credentials" };
  }

  try {
    const updated = await revokeVerifiableCredential({
      credentialId: data.credentialId,
      reason: data.reason,
      revokedById: session.user.id,
      anchorOnChain: true,
    });

    revalidatePath(`/dashboard/orgs/${existing.organizationId}`);
    revalidatePath("/dashboard/credentials");

    return { success: true, credential: updated };
  } catch (err: any) {
    console.error("Failed to revoke credential:", err);
    return { success: false, error: err.message || "Failed to revoke credential" };
  }
}

export async function verifyCredentialAction(
  input: CompleteVerifiableCredential | { credentialId: string }
): Promise<CredentialVerificationResult> {
  const session = await auth();
  return verifyVerifiableCredential(input, {
    logAudit: true,
    verifierId: session?.user?.id ?? undefined,
  });
}

export async function getCredentialsByOrgAction(organizationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required", data: [] };
  }

  const list = await db.query.credentials.findMany({
    where: eq(credentials.organizationId, organizationId),
    orderBy: [desc(credentials.issuedAt)],
    with: {
      organization: true,
      issuedBy: true,
    },
  });

  return { success: true, data: list };
}

export async function getMyCredentialsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required", data: [] };
  }

  const userId = session.user.id;
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const subjectDids = [
    user?.did,
    `did:shield:${userId}`,
    `did:shield:user:${userId}`,
  ].filter(Boolean) as string[];

  const allCreds = await db.query.credentials.findMany({
    orderBy: [desc(credentials.issuedAt)],
    with: {
      organization: true,
      issuedBy: true,
    },
  });

  const myCreds = allCreds.filter((c) =>
    subjectDids.includes(c.subjectDid) || c.issuedById === userId
  );

  return { success: true, data: myCreds };
}

export async function getCredentialByIdAction(credentialId: string) {
  const record = await db.query.credentials.findFirst({
    where: eq(credentials.id, credentialId),
    with: {
      organization: true,
      issuedBy: true,
    },
  });

  if (!record) return { success: false, error: "Credential not found" };

  return { success: true, data: record };
}
