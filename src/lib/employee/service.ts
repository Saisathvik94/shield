import { prisma } from "@/lib/db/prisma";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  validateEmployeeHierarchy,
} from "./validation";
import { ConflictError, NotFoundError } from "@/lib/auth/session";
import { z } from "zod";
import { EmployeeStatus } from "@/generated/prisma/enums";

export async function listEmployees(
  organizationId: string,
  params: z.infer<typeof employeeQuerySchema>
) {
  const parsed = employeeQuerySchema.parse(params);
  const { search, status, departmentId, sectionId, teamId, page, limit } = parsed;
  const skip = (page - 1) * limit;

  const whereClause = {
    organizationId,
    ...(status && { status: status as EmployeeStatus }),
    ...(departmentId && { departmentId }),
    ...(sectionId && { sectionId }),
    ...(teamId && { teamId }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { employeeCode: { contains: search, mode: "insensitive" as const } },
        { designation: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        department: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.employee.count({ where: whereClause }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEmployeeById(id: string, organizationId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      department: { select: { id: true, name: true, code: true } },
      section: { select: { id: true, name: true, code: true } },
      team: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!employee || employee.organizationId !== organizationId) {
    throw new NotFoundError("Employee not found in your organization.");
  }

  return employee;
}

export async function createEmployee(
  organizationId: string,
  data: z.infer<typeof createEmployeeSchema>
) {
  const parsed = createEmployeeSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    // 1. Verify employee code uniqueness within the organization
    const existing = await tx.employee.findUnique({
      where: {
        organizationId_employeeCode: {
          organizationId,
          employeeCode: parsed.employeeCode,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(
        `An employee with code '${parsed.employeeCode}' already exists in this organization.`
      );
    }

    // 2. Validate multi-tenant hierarchy integrity
    await validateEmployeeHierarchy(tx, {
      organizationId,
      departmentId: parsed.departmentId,
      sectionId: parsed.sectionId,
      teamId: parsed.teamId,
      userId: parsed.userId,
    });

    // 3. Create the employee
    return await tx.employee.create({
      data: {
        employeeCode: parsed.employeeCode,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone,
        designation: parsed.designation,
        status: parsed.status as EmployeeStatus,
        organizationId,
        departmentId: parsed.departmentId || null,
        sectionId: parsed.sectionId || null,
        teamId: parsed.teamId || null,
        userId: parsed.userId || null,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
  });
}

export async function updateEmployee(
  id: string,
  organizationId: string,
  data: z.infer<typeof updateEmployeeSchema>
) {
  const parsed = updateEmployeeSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    const current = await tx.employee.findUnique({
      where: { id },
    });

    if (!current || current.organizationId !== organizationId) {
      throw new NotFoundError("Employee not found in your organization.");
    }

    // 1. If changing employeeCode, check uniqueness
    if (parsed.employeeCode && parsed.employeeCode !== current.employeeCode) {
      const existing = await tx.employee.findUnique({
        where: {
          organizationId_employeeCode: {
            organizationId,
            employeeCode: parsed.employeeCode,
          },
        },
        select: { id: true },
      });

      if (existing && existing.id !== id) {
        throw new ConflictError(
          `An employee with code '${parsed.employeeCode}' already exists in this organization.`
        );
      }
    }

    const nextDepartmentId =
      parsed.departmentId !== undefined ? parsed.departmentId : current.departmentId;
    const nextSectionId =
      parsed.sectionId !== undefined ? parsed.sectionId : current.sectionId;
    const nextTeamId = parsed.teamId !== undefined ? parsed.teamId : current.teamId;
    const nextUserId = parsed.userId !== undefined ? parsed.userId : current.userId;

    // 2. Validate hierarchical lineage
    await validateEmployeeHierarchy(tx, {
      organizationId,
      departmentId: nextDepartmentId,
      sectionId: nextSectionId,
      teamId: nextTeamId,
      userId: nextUserId,
      currentEmployeeId: id,
    });

    return await tx.employee.update({
      where: { id },
      data: {
        ...(parsed.employeeCode && { employeeCode: parsed.employeeCode }),
        ...(parsed.firstName && { firstName: parsed.firstName }),
        ...(parsed.lastName && { lastName: parsed.lastName }),
        ...(parsed.email && { email: parsed.email }),
        ...(parsed.phone !== undefined && { phone: parsed.phone }),
        ...(parsed.designation !== undefined && { designation: parsed.designation }),
        ...(parsed.status && { status: parsed.status as EmployeeStatus }),
        ...(parsed.departmentId !== undefined && { departmentId: parsed.departmentId }),
        ...(parsed.sectionId !== undefined && { sectionId: parsed.sectionId }),
        ...(parsed.teamId !== undefined && { teamId: parsed.teamId }),
        ...(parsed.userId !== undefined && { userId: parsed.userId }),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
  });
}

export async function changeEmployeeStatus(
  id: string,
  organizationId: string,
  status: EmployeeStatus
) {
  const employee = await getEmployeeById(id, organizationId);

  return await prisma.employee.update({
    where: { id: employee.id },
    data: { status },
  });
}

export async function deleteEmployee(id: string, organizationId: string) {
  const employee = await getEmployeeById(id, organizationId);

  return await prisma.employee.delete({
    where: { id: employee.id },
  });
}
