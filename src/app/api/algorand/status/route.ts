import { NextResponse } from "next/server";
import { BlockchainService } from "@/lib/algorand/blockchain.service";
import { requireAuth, handleApiError } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireAuth();
    const status = await BlockchainService.checkConnection();
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    return handleApiError(error);
  }
}
