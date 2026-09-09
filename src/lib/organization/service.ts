import { prisma } from "@/lib/db/prisma";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createSectionSchema,
  updateSectionSchema,
  createTeamSchema,
  updateTeamSchema,
  validateDepartmentBelongsToOrg,
  validateSectionBelongsToDept,
} from "./validation";
import { AppError, ConflictError, NotFoundError } from "@/lib/auth/session";
import { z } from "zod";
import { OrganizationStatus } from "@/generated/prisma/enums";

// -----------------------------------------------------------------------------
// Organization Services
// -----------------------------------------------------------------------------

export async function createOrganization(data: z.infer<typeof createOrganizationSchema>) {
  const parsed = createOrganizationSchema.parse(data);

  const existingSlug = await prisma.organization.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });

  if (existingSlug) {
    throw new ConflictError(`An organization with slug '${parsed.slug}' already exists.`);
  }

  return await prisma.organization.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      status: parsed.status as OrganizationStatus,
    },
  });
}

export async function getOrganizations() {
  return await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          departments: true,
          employees: true,
        },
      },
    },
  });
}

export async function getOrganizationById(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          departments: true,
          employees: true,
        },
      },
    },
  });

  if (!org) {
    throw new NotFoundError("Organization not found.");
  }

  return org;
}

export async function getOrganizationBySlug(slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!org) {
    throw new NotFoundError("Organization not found.");
  }

  return org;
}

export async function updateOrganization(
  id: string,
  data: z.infer<typeof updateOrganizationSchema>
) {
  const parsed = updateOrganizationSchema.parse(data);

  await getOrganizationById(id);

  if (parsed.slug) {
    const existingSlug = await prisma.organization.findUnique({
      where: { slug: parsed.slug },
      select: { id: true },
    });

    if (existingSlug && existingSlug.id !== id) {
      throw new ConflictError(`An organization with slug '${parsed.slug}' already exists.`);
    }
  }

  return await prisma.organization.update({
    where: { id },
    data: {
      ...(parsed.name && { name: parsed.name }),
      ...(parsed.slug && { slug: parsed.slug }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.status && { status: parsed.status as OrganizationStatus }),
    },
  });
}

export async function changeOrganizationStatus(id: string, status: OrganizationStatus) {
  await getOrganizationById(id);

  return await prisma.organization.update({
    where: { id },
    data: { status },
  });
}

export async function getOrganizationStats(organizationId: string) {
  const [
    org,
    totalEmployees,
    activeEmployees,
    departmentsCount,
    sectionsCount,
    teamsCount,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.employee.count({ where: { organizationId } }),
    prisma.employee.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.department.count({ where: { organizationId } }),
    prisma.section.count({
      where: {
        department: { organizationId },
      },
    }),
    prisma.team.count({
      where: {
        section: {
          department: { organizationId },
        },
      },
    }),
  ]);

  if (!org) {
    throw new NotFoundError("Organization not found.");
  }

  return {
    organization: org,
    counts: {
      totalEmployees,
      activeEmployees,
      departments: departmentsCount,
      sections: sectionsCount,
      teams: teamsCount,
    },
  };
}

// -----------------------------------------------------------------------------
// Department Services
// -----------------------------------------------------------------------------

export async function listDepartments(organizationId: string) {
  return await prisma.department.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          sections: true,
          employees: true,
        },
      },
    },
  });
}

export async function getDepartmentById(id: string, organizationId: string) {
  const dept = await prisma.department.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { teams: true, employees: true },
          },
        },
      },
      _count: {
        select: { employees: true },
      },
    },
  });

  if (!dept || dept.organizationId !== organizationId) {
    throw new NotFoundError("Department not found in your organization.");
  }

  return dept;
}

export async function createDepartment(
  organizationId: string,
  data: z.infer<typeof createDepartmentSchema>
) {
  const parsed = createDepartmentSchema.parse(data);

  // Check code uniqueness within organization
  const existing = await prisma.department.findUnique({
    where: {
      organizationId_code: {
        organizationId,
        code: parsed.code,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      `A department with code '${parsed.code}' already exists in this organization.`
    );
  }

  return await prisma.department.create({
    data: {
      organizationId,
      name: parsed.name,
      code: parsed.code,
      description: parsed.description,
    },
  });
}

export async function updateDepartment(
  id: string,
  organizationId: string,
  data: z.infer<typeof updateDepartmentSchema>
) {
  const parsed = updateDepartmentSchema.parse(data);

  await validateDepartmentBelongsToOrg(prisma, id, organizationId);

  if (parsed.code) {
    const existing = await prisma.department.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: parsed.code,
        },
      },
    });

    if (existing && existing.id !== id) {
      throw new ConflictError(
        `A department with code '${parsed.code}' already exists in this organization.`
      );
    }
  }

  return await prisma.department.update({
    where: { id },
    data: {
      ...(parsed.name && { name: parsed.name }),
      ...(parsed.code && { code: parsed.code }),
      ...(parsed.description !== undefined && { description: parsed.description }),
    },
  });
}

export async function deleteDepartment(id: string, organizationId: string) {
  await validateDepartmentBelongsToOrg(prisma, id, organizationId);

  // Check for dependent sections
  const sectionsCount = await prisma.section.count({
    where: { departmentId: id },
  });

  if (sectionsCount > 0) {
    throw new AppError(
      `Cannot delete department: It still contains ${sectionsCount} section(s). Remove or reassign them first.`,
      400
    );
  }

  return await prisma.department.delete({
    where: { id },
  });
}

// -----------------------------------------------------------------------------
// Section Services
// -----------------------------------------------------------------------------

export async function listSections(organizationId: string, departmentId?: string) {
  return await prisma.section.findMany({
    where: {
      department: {
        organizationId,
        ...(departmentId && { id: departmentId }),
      },
    },
    orderBy: { name: "asc" },
    include: {
      department: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: {
          teams: true,
          employees: true,
        },
      },
    },
  });
}

export async function getSectionById(id: string, organizationId: string) {
  const section = await prisma.section.findUnique({
    where: { id },
    include: {
      department: {
        select: { id: true, name: true, code: true, organizationId: true },
      },
      teams: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { employees: true } },
        },
      },
      _count: {
        select: { employees: true },
      },
    },
  });

  if (!section || section.department.organizationId !== organizationId) {
    throw new NotFoundError("Section not found in your organization.");
  }

  return section;
}

export async function createSection(
  organizationId: string,
  data: z.infer<typeof createSectionSchema>
) {
  const parsed = createSectionSchema.parse(data);

  // Validate department belongs to org
  await validateDepartmentBelongsToOrg(prisma, parsed.departmentId, organizationId);

  // Check code uniqueness within department
  const existing = await prisma.section.findUnique({
    where: {
      departmentId_code: {
        departmentId: parsed.departmentId,
        code: parsed.code,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      `A section with code '${parsed.code}' already exists in this department.`
    );
  }

  return await prisma.section.create({
    data: {
      departmentId: parsed.departmentId,
      name: parsed.name,
      code: parsed.code,
      description: parsed.description,
    },
  });
}

export async function updateSection(
  id: string,
  organizationId: string,
  data: z.infer<typeof updateSectionSchema>
) {
  const parsed = updateSectionSchema.parse(data);

  const currentSection = await getSectionById(id, organizationId);

  if (parsed.code) {
    const existing = await prisma.section.findUnique({
      where: {
        departmentId_code: {
          departmentId: currentSection.departmentId,
          code: parsed.code,
        },
      },
    });

    if (existing && existing.id !== id) {
      throw new ConflictError(
        `A section with code '${parsed.code}' already exists in this department.`
      );
    }
  }

  return await prisma.section.update({
    where: { id },
    data: {
      ...(parsed.name && { name: parsed.name }),
      ...(parsed.code && { code: parsed.code }),
      ...(parsed.description !== undefined && { description: parsed.description }),
    },
  });
}

export async function deleteSection(id: string, organizationId: string) {
  await getSectionById(id, organizationId);

  // Check for dependent teams
  const teamsCount = await prisma.team.count({
    where: { sectionId: id },
  });

  if (teamsCount > 0) {
    throw new AppError(
      `Cannot delete section: It still contains ${teamsCount} team(s). Remove or reassign them first.`,
      400
    );
  }

  return await prisma.section.delete({
    where: { id },
  });
}

// -----------------------------------------------------------------------------
// Team Services
// -----------------------------------------------------------------------------

export async function listTeams(organizationId: string, sectionId?: string) {
  return await prisma.team.findMany({
    where: {
      section: {
        department: { organizationId },
        ...(sectionId && { id: sectionId }),
      },
    },
    orderBy: { name: "asc" },
    include: {
      section: {
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      },
      _count: {
        select: { employees: true },
      },
    },
  });
}

export async function getTeamById(id: string, organizationId: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      section: {
        include: {
          department: {
            select: { id: true, name: true, code: true, organizationId: true },
          },
        },
      },
      _count: {
        select: { employees: true },
      },
    },
  });

  if (!team || team.section.department.organizationId !== organizationId) {
    throw new NotFoundError("Team not found in your organization.");
  }

  return team;
}

export async function createTeam(
  organizationId: string,
  data: z.infer<typeof createTeamSchema>
) {
  const parsed = createTeamSchema.parse(data);

  // Validate section belongs to organization
  await validateSectionBelongsToDept(prisma, parsed.sectionId, null, organizationId);

  // Check code uniqueness within section
  const existing = await prisma.team.findUnique({
    where: {
      sectionId_code: {
        sectionId: parsed.sectionId,
        code: parsed.code,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      `A team with code '${parsed.code}' already exists in this section.`
    );
  }

  return await prisma.team.create({
    data: {
      sectionId: parsed.sectionId,
      name: parsed.name,
      code: parsed.code,
      description: parsed.description,
    },
  });
}

export async function updateTeam(
  id: string,
  organizationId: string,
  data: z.infer<typeof updateTeamSchema>
) {
  const parsed = updateTeamSchema.parse(data);

  const currentTeam = await getTeamById(id, organizationId);

  if (parsed.code) {
    const existing = await prisma.team.findUnique({
      where: {
        sectionId_code: {
          sectionId: currentTeam.sectionId,
          code: parsed.code,
        },
      },
    });

    if (existing && existing.id !== id) {
      throw new ConflictError(
        `A team with code '${parsed.code}' already exists in this section.`
      );
    }
  }

  return await prisma.team.update({
    where: { id },
    data: {
      ...(parsed.name && { name: parsed.name }),
      ...(parsed.code && { code: parsed.code }),
      ...(parsed.description !== undefined && { description: parsed.description }),
    },
  });
}

export async function deleteTeam(id: string, organizationId: string) {
  await getTeamById(id, organizationId);

  return await prisma.team.delete({
    where: { id },
  });
}
