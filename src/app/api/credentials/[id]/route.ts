import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cred = await db.query.credentials.findFirst({
      where: eq(credentials.id, id),
      with: { organization: true, issuedBy: true },
    });

    if (!cred) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, credential: cred });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
