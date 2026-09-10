import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyVerifiableCredential } from "@/lib/verification/credential-verifier";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const result = await verifyVerifiableCredential(body, {
      logAudit: true,
      verifierId: session?.user?.id,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
