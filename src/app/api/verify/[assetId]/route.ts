import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyAssetFull7Point } from "@/lib/verification/asset-verifier";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await auth();
    const { assetId } = await params;

    const result = await verifyAssetFull7Point(assetId, {
      viewerUserId: session?.user?.id ?? null,
      logAudit: true,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
