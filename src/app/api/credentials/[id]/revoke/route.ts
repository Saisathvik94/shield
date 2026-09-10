import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeVerifiableCredential } from "@/lib/credential/revoker";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const reason = body.reason || "Revoked by issuer authority";

    const updated = await revokeVerifiableCredential({
      credentialId: id,
      reason,
      revokedById: session.user.id,
      anchorOnChain: true,
    });

    return NextResponse.json({ success: true, credential: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
