import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import { changeEmployeeStatus } from "@/lib/employee/service";
import { changeEmployeeStatusSchema } from "@/lib/employee/validation";
import { EmployeeStatus } from "@/generated/prisma/enums";

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

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || body.organizationId;

    if (!organizationId) {
      throw new AppError("organizationId is required", 400);
    }

    const validation = changeEmployeeStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid employee status value",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await changeEmployeeStatus(
      id,
      organizationId,
      validation.data.status as EmployeeStatus
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
