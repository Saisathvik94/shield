import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { issueVerifiableCredential } from "@/lib/credential/issuer";
import { CredentialType, CredentialClaims } from "@/lib/credential/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId");
    const subjectDid = searchParams.get("subjectDid");

    if (orgId) {
      const data = await db.query.credentials.findMany({
        where: eq(credentials.organizationId, orgId),
        orderBy: [desc(credentials.issuedAt)],
        with: { organization: true, issuedBy: true },
      });
      return NextResponse.json({ success: true, credentials: data });
    }

    if (subjectDid) {
      const data = await db.query.credentials.findMany({
        where: eq(credentials.subjectDid, subjectDid),
        orderBy: [desc(credentials.issuedAt)],
        with: { organization: true, issuedBy: true },
      });
      return NextResponse.json({ success: true, credentials: data });
    }

    const data = await db.query.credentials.findMany({
      limit: 50,
      orderBy: [desc(credentials.issuedAt)],
      with: { organization: true, issuedBy: true },
    });
    return NextResponse.json({ success: true, credentials: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, subjectDid, organizationId, claims, expiresAt } = body;

    if (!type || !subjectDid || !organizationId || !claims) {
      return NextResponse.json(
        { error: "Missing required fields: type, subjectDid, organizationId, claims" },
        { status: 400 }
      );
    }

    const issuerDid = `did:shield:user:${session.user.id}`;

    const result = await issueVerifiableCredential({
      type: type as CredentialType,
      issuerDid,
      subjectDid,
      organizationId,
      issuedById: session.user.id,
      claims: claims as CredentialClaims,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      anchorOnChain: true,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
