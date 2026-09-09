import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  organizations,
  organizationMemberships,
  departments,
  sections,
  teams,
} from "@/db/schema";
import type { NewOrganization } from "@/db/schema";

export async function getOrganizationById(id: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
    with: {
      createdBy: true,
      departments: {
        with: {
          sections: {
            with: { teams: true },
          },
        },
      },
    },
  });
}

export async function getOrganizationBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
}

export async function getOrganizationsByUser(userId: string) {
  const memberships = await db.query.organizationMemberships.findMany({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.status, "ACTIVE")
    ),
    with: {
      organization: true,
    },
  });
  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    membershipId: m.id,
  }));
}

export async function createOrganization(
  data: NewOrganization,
  creatorUserId: string
) {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ ...data, createdById: creatorUserId })
      .returning();

    // Creator becomes OWNER
    await tx.insert(organizationMemberships).values({
      organizationId: org.id,
      userId: creatorUserId,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    });

    return org;
  });
}

export async function updateOrganization(
  id: string,
  data: Partial<
    Pick<NewOrganization, "name" | "description" | "logoUrl" | "website">
  >
) {
  const [org] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return org;
}

export async function getMembership(organizationId: string, userId: string) {
  return db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, userId)
    ),
  });
}

export async function getOrganizationMembers(organizationId: string) {
  return db.query.organizationMemberships.findMany({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.status, "ACTIVE")
    ),
    with: {
      user: {
        with: { walletIdentities: true },
      },
      assignments: {
        with: {
          department: true,
          section: true,
          team: true,
        },
      },
    },
  });
}

export async function getDepartments(organizationId: string) {
  return db.query.departments.findMany({
    where: eq(departments.organizationId, organizationId),
    with: {
      head: true,
      sections: {
        with: {
          head: true,
          teams: { with: { lead: true } },
        },
      },
    },
  });
}

export async function createDepartment(
  organizationId: string,
  name: string,
  description?: string
) {
  const [dept] = await db
    .insert(departments)
    .values({ organizationId, name, description })
    .returning();
  return dept;
}

export async function createSection(
  departmentId: string,
  organizationId: string,
  name: string,
  description?: string
) {
  const [section] = await db
    .insert(sections)
    .values({ departmentId, organizationId, name, description })
    .returning();
  return section;
}

export async function createTeam(
  organizationId: string,
  name: string,
  opts?: { sectionId?: string; departmentId?: string; description?: string }
) {
  const [team] = await db
    .insert(teams)
    .values({ organizationId, name, ...opts })
    .returning();
  return team;
}

// Generate a URL-safe slug from an org name
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

// Ensure slug uniqueness by appending a counter if needed
export async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 1;
  while (await getOrganizationBySlug(slug)) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export async function getPendingInvitations(organizationId: string) {
  const { invitations } = await import("@/db/schema");
  return db.query.invitations.findMany({
    where: and(
      eq(invitations.organizationId, organizationId),
      eq(invitations.status, "PENDING")
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      invitedBy: true,
      department: true,
      section: true,
    } as never,
  });
}
