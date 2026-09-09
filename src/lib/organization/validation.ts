import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AppError, NotFoundError } from "@/lib/auth/session";
import { PrismaClient } from "@/generated/prisma/client";

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const changeOrgStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Department name must be at least 2 characters").max(100),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase alphanumeric characters, underscores, or hyphens"),
  description: z.string().trim().max(500).optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createSectionSchema = z.object({
  departmentId: z.string().uuid("Invalid department ID"),
  name: z.string().trim().min(2, "Section name must be at least 2 characters").max(100),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase alphanumeric characters, underscores, or hyphens"),
  description: z.string().trim().max(500).optional().nullable(),
});

export const updateSectionSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const createTeamSchema = z.object({
  sectionId: z.string().uuid("Invalid section ID"),
  name: z.string().trim().min(2, "Team name must be at least 2 characters").max(100),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase alphanumeric characters, underscores, or hyphens"),
  description: z.string().trim().max(500).optional().nullable(),
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

// -----------------------------------------------------------------------------
// Hierarchy Validation Functions
// -----------------------------------------------------------------------------

type DbClient = PrismaClient | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Validates that a department belongs to the specified organization.
 */
export async function validateDepartmentBelongsToOrg(
  db: DbClient,
  departmentId: string,
  organizationId: string
) {
  const department = await db.department.findUnique({
    where: { id: departmentId },
    select: { id: true, organizationId: true, name: true, code: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found.");
  }

  if (department.organizationId !== organizationId) {
    throw new AppError(
      "Hierarchy violation: Selected Department does not belong to your organization.",
      400
    );
  }

  return department;
}

/**
 * Validates that a section belongs to the department, and that the department belongs to the organization.
 */
export async function validateSectionBelongsToDept(
  db: DbClient,
  sectionId: string,
  expectedDepartmentId: string | null | undefined,
  organizationId: string
) {
  const section = await db.section.findUnique({
    where: { id: sectionId },
    include: {
      department: {
        select: { id: true, organizationId: true },
      },
    },
  });

  if (!section) {
    throw new NotFoundError("Section not found.");
  }

  if (section.department.organizationId !== organizationId) {
    throw new AppError(
      "Hierarchy violation: Selected Section does not belong to your organization.",
      400
    );
  }

  if (expectedDepartmentId && section.departmentId !== expectedDepartmentId) {
    throw new AppError(
      "Hierarchy violation: Selected Section does not belong to the chosen Department.",
      400
    );
  }

  return section;
}

/**
 * Validates that a team belongs to the section, which in turn belongs to the department and organization.
 */
export async function validateTeamBelongsToSection(
  db: DbClient,
  teamId: string,
  expectedSectionId: string | null | undefined,
  expectedDepartmentId: string | null | undefined,
  organizationId: string
) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      section: {
        include: {
          department: {
            select: { id: true, organizationId: true },
          },
        },
      },
    },
  });

  if (!team) {
    throw new NotFoundError("Team not found.");
  }

  if (team.section.department.organizationId !== organizationId) {
    throw new AppError(
      "Hierarchy violation: Selected Team does not belong to your organization.",
      400
    );
  }

  if (expectedSectionId && team.sectionId !== expectedSectionId) {
    throw new AppError(
      "Hierarchy violation: Selected Team does not belong to the chosen Section.",
      400
    );
  }

  if (expectedDepartmentId && team.section.departmentId !== expectedDepartmentId) {
    throw new AppError(
      "Hierarchy violation: Selected Team's Section does not belong to the chosen Department.",
      400
    );
  }

  return team;
}
