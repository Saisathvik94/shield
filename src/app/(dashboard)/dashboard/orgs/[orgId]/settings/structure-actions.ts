"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getMembership, createDepartment, createSection } from "@/db/queries/organizations";
import { db } from "@/db";
import { departments, sections, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

type ActionResult = { status: "success" } | { status: "error"; message: string };

export async function createDepartmentAction(
  organizationId: string,
  name: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const membership = await getMembership(organizationId, session.user.id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }
  if (!name.trim() || name.trim().length < 2) {
    return { status: "error", message: "Department name must be at least 2 characters." };
  }
  await createDepartment(organizationId, name.trim());
  revalidatePath(`/dashboard/orgs/${organizationId}/settings`);
  return { status: "success" };
}

export async function createSectionAction(
  departmentId: string,
  organizationId: string,
  name: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const membership = await getMembership(organizationId, session.user.id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }
  if (!name.trim() || name.trim().length < 2) {
    return { status: "error", message: "Section name must be at least 2 characters." };
  }
  await createSection(departmentId, organizationId, name.trim());
  revalidatePath(`/dashboard/orgs/${organizationId}/settings`);
  return { status: "success" };
}

export async function createTeamAction(
  sectionId: string,
  departmentId: string,
  organizationId: string,
  name: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const membership = await getMembership(organizationId, session.user.id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }
  if (!name.trim() || name.trim().length < 2) {
    return { status: "error", message: "Team name must be at least 2 characters." };
  }
  await db.insert(teams).values({ organizationId, sectionId, departmentId, name: name.trim() });
  revalidatePath(`/dashboard/orgs/${organizationId}/settings`);
  return { status: "success" };
}

export async function setDepartmentHeadAction(
  departmentId: string,
  organizationId: string,
  headUserId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const membership = await getMembership(organizationId, session.user.id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }
  await db
    .update(departments)
    .set({ headId: headUserId || null, updatedAt: new Date() })
    .where(eq(departments.id, departmentId));
  revalidatePath(`/dashboard/orgs/${organizationId}/settings`);
  return { status: "success" };
}

export async function setSectionHeadAction(
  sectionId: string,
  organizationId: string,
  headUserId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const membership = await getMembership(organizationId, session.user.id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "Access denied." };
  }
  await db
    .update(sections)
    .set({ headId: headUserId || null, updatedAt: new Date() })
    .where(eq(sections.id, sectionId));
  revalidatePath(`/dashboard/orgs/${organizationId}/settings`);
  return { status: "success" };
}
