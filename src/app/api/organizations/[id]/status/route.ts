import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import { changeOrganizationStatus } from "@/lib/organization/service";
import { changeOrgStatusSchema } from "@/lib/organization/validation";
import { OrganizationStatus } from "@/generated/prisma/enums";

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

    const validation = changeOrgStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status value",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await changeOrganizationStatus(
      id,
      validation.data.status as OrganizationStatus
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
