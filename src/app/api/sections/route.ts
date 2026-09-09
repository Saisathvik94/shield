import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import { listSections, createSection } from "@/lib/organization/service";
import { createSectionSchema } from "@/lib/organization/validation";
import { z } from "zod";

const postSchema = createSectionSchema.extend({
  organizationId: z.string().uuid("Invalid organization ID"),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const departmentId = searchParams.get("departmentId") || undefined;

    if (!organizationId) {
      throw new AppError("organizationId parameter is required", 400);
    }

    const sections = await listSections(organizationId, departmentId);
    return NextResponse.json({ success: true, data: sections });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => null);
    if (!body) {
      throw new AppError("Invalid JSON body", 400);
    }

    const validation = postSchema.safeParse(body);
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
    const section = await createSection(organizationId, data);
    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
