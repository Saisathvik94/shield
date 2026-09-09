import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/auth/session";
import { getOrganizationStats } from "@/lib/organization/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const stats = await getOrganizationStats(id);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return handleApiError(error);
  }
}
