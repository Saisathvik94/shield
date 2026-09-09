import { z } from "zod";
import { AppError, ConflictError, NotFoundError } from "@/lib/auth/session";
import { PrismaClient } from "@/generated/prisma/client";
import {
  validateDepartmentBelongsToOrg,
  validateSectionBelongsToDept,
  validateTeamBelongsToSection,
} from "@/lib/organization/validation";

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, "Employee code is required")
    .max(30)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "Employee code must contain only uppercase alphanumeric characters, underscores, or hyphens"),
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .transform((val) => val.toLowerCase()),
  phone: z.string().trim().max(30).optional().nullable(),
  designation: z.string().trim().max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"]).default("ACTIVE"),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  sectionId: z.string().uuid("Invalid section ID").optional().nullable(),
  teamId: z.string().uuid("Invalid team ID").optional().nullable(),
  userId: z.string().uuid("Invalid user ID").optional().nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const changeEmployeeStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"]),
});

export const employeeQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

type DbClient = PrismaClient | Parameters<Parameters<typeof import("@/lib/db/prisma").prisma.$transaction>[0]>[0];

/**
 * Validates the entire hierarchical lineage of an employee assignment.
 * Enforces:
 *   Employee.organizationId === Department.organizationId
 *   Section.departmentId === Department.id
 *   Team.sectionId === Section.id
 */
export async function validateEmployeeHierarchy(
  db: DbClient,
  data: {
    organizationId: string;
    departmentId?: string | null;
    sectionId?: string | null;
    teamId?: string | null;
    userId?: string | null;
    currentEmployeeId?: string;
  }
) {
  const { organizationId, departmentId, sectionId, teamId, userId, currentEmployeeId } = data;

  // 1. If Team is specified, Section is required
  if (teamId && !sectionId) {
    throw new AppError("Hierarchy error: A Section must be selected when assigning a Team.", 400);
  }

  // 2. If Section is specified, Department is required
  if (sectionId && !departmentId) {
    throw new AppError("Hierarchy error: A Department must be selected when assigning a Section.", 400);
  }

  // 3. Validate Department belongs to Organization
  if (departmentId) {
    await validateDepartmentBelongsToOrg(db, departmentId, organizationId);
  }

  // 4. Validate Section belongs to Department & Organization
  if (sectionId) {
    await validateSectionBelongsToDept(db, sectionId, departmentId, organizationId);
  }

  // 5. Validate Team belongs to Section & Department & Organization
  if (teamId) {
    await validateTeamBelongsToSection(db, teamId, sectionId, departmentId, organizationId);
  }

  // 6. Validate User account mapping (1-to-1)
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("Associated user account not found.");
    }

    const existingEmployeeForUser = await db.employee.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existingEmployeeForUser && existingEmployeeForUser.id !== currentEmployeeId) {
      throw new ConflictError("This user account is already linked to another employee.");
    }
  }
}
