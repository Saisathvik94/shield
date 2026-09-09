import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError, AppError } from "@/lib/auth/session";
import { listEmployees, createEmployee } from "@/lib/employee/service";
import {
  createEmployeeSchema,
  employeeQuerySchema,
} from "@/lib/employee/validation";
import { z } from "zod";

const postSchema = createEmployeeSchema.extend({
  organizationId: z.string().uuid("Invalid organization ID"),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      throw new AppError("organizationId parameter is required", 400);
    }

    const query = {
      search: searchParams.get("search") || undefined,
      status: (searchParams.get("status") as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED" | null) || undefined,
      departmentId: searchParams.get("departmentId") || undefined,
      sectionId: searchParams.get("sectionId") || undefined,
      teamId: searchParams.get("teamId") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 10,
    };

    const validatedQuery = employeeQuerySchema.parse(query);
    const result = await listEmployees(organizationId, validatedQuery);
    return NextResponse.json({ success: true, data: result });
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
    const employee = await createEmployee(organizationId, data);
    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
