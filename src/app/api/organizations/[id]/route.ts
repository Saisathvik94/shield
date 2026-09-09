import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import {
  getOrganizationById,
  updateOrganization,
} from "@/lib/organization/service";
import { updateOrganizationSchema } from "@/lib/organization/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const organization = await getOrganizationById(id);
    return NextResponse.json({ success: true, data: organization });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      throw new AppError("Invalid JSON body", 400);
    }

    const validation = updateOrganizationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await updateOrganization(id, validation.data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
