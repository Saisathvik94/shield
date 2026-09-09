import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import { listTeams, createTeam } from "@/lib/organization/service";
import { createTeamSchema } from "@/lib/organization/validation";
import { z } from "zod";

const postSchema = createTeamSchema.extend({
  organizationId: z.string().uuid("Invalid organization ID"),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const sectionId = searchParams.get("sectionId") || undefined;

    if (!organizationId) {
      throw new AppError("organizationId parameter is required", 400);
    }

    const teams = await listTeams(organizationId, sectionId);
    return NextResponse.json({ success: true, data: teams });
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
    const team = await createTeam(organizationId, data);
    return NextResponse.json({ success: true, data: team }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
