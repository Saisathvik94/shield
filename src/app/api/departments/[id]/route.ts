import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import {
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "@/lib/organization/service";
import { updateDepartmentSchema } from "@/lib/organization/validation";
import { z } from "zod";

const patchSchema = updateDepartmentSchema.extend({
  organizationId: z.string().uuid("Invalid organization ID"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      throw new AppError("organizationId parameter is required", 400);
    }

    const dept = await getDepartmentById(id, organizationId);
    return NextResponse.json({ success: true, data: dept });
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

    const validation = patchSchema.safeParse(body);
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

    const { organizationId, ...data } = validation.data;
    const updated = await updateDepartment(id, organizationId, data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      throw new AppError("organizationId parameter is required", 400);
    }

    await deleteDepartment(id, organizationId);
    return NextResponse.json({ success: true, message: "Department deleted successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
