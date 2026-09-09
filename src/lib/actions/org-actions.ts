"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createOrganization,
  updateOrganization,
  getOrganizationsByUser,
  getMembership,
  slugify,
  uniqueSlug,
} from "@/db/queries/organizations";
import { createAuditEvent } from "@/db/queries/audit";
import { isAlgorandConfigured } from "@/lib/algorand/client";
import { anchorOrgRegistration } from "@/lib/algorand/audit-anchor";

export type OrgActionResult =
  | { status: "success"; orgId: string; slug: string }
  | { status: "error"; message: string };

export async function createOrg(formData: FormData): Promise<OrgActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Not authenticated." };
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const website = (formData.get("website") as string)?.trim();

  if (!name || name.length < 2) {
    return { status: "error", message: "Organization name must be at least 2 characters." };
  }
  if (name.length > 80) {
    return { status: "error", message: "Organization name must be 80 characters or fewer." };
  }

  const baseSlug = slugify(name);
  const slug = await uniqueSlug(baseSlug);

  const org = await createOrganization(
    { name, slug, description: description || null, website: website || null },
    session.user.id
  );

  const auditEvent = await createAuditEvent({
    organizationId: org.id,
    actorId: session.user.id,
    eventType: "ORG_CREATED",
    resourceType: "organization",
    resourceId: org.id,
    description: `Organization "${name}" created`,
  });

  // Anchor org creation on Algorand (non-blocking)
  if (isAlgorandConfigured()) {
    anchorOrgRegistration({
      auditEventId: auditEvent.id,
      organizationId: org.id,
      orgName: name,
      actorUserId: session.user.id,
    }).catch((err) => console.error("[SHIELD] anchorOrg error:", err));
  }

  revalidatePath("/dashboard");
  return { status: "success", orgId: org.id, slug: org.slug };
}

export async function updateOrg(
  orgId: string,
  formData: FormData
): Promise<OrgActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Not authenticated." };
  }

  const membership = await getMembership(orgId, session.user.id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return { status: "error", message: "You don't have permission to update this organization." };
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const website = (formData.get("website") as string)?.trim();

  if (name && name.length < 2) {
    return { status: "error", message: "Name must be at least 2 characters." };
  }

  const org = await updateOrganization(orgId, {
    name: name || undefined,
    description: description || undefined,
    website: website || undefined,
  });

  await createAuditEvent({
    organizationId: orgId,
    actorId: session.user.id,
    eventType: "ORG_UPDATED",
    resourceType: "organization",
    resourceId: orgId,
    description: `Organization settings updated`,
  });

  revalidatePath(`/dashboard/orgs/${orgId}`);
  return { status: "success", orgId: org.id, slug: org.slug };
}

export async function getUserOrgs() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return getOrganizationsByUser(session.user.id);
}
