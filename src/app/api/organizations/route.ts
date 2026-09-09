import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import { createOrganization, getOrganizations } from "@/lib/organization/service";
import { createOrganizationSchema } from "@/lib/organization/validation";

export async function GET() {
  try {
    await requireAuth();
    const organizations = await getOrganizations();
    return NextResponse.json({ success: true, data: organizations });
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

    const validation = createOrganizationSchema.safeParse(body);
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

    const org = await createOrganization(validation.data);
    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
