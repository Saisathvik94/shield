"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  organizationMemberships,
  invitations,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditEvent } from "@/db/queries/audit";

export type MemberActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCallerMembership(orgId: string, callerId: string) {
  return db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, callerId),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });
}

const ROLE_RANK: Record<string, number> = {
  USER: 0,
  AUDITOR: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4,
};

// ─── Change role ──────────────────────────────────────────────────────────────

export async function changeMemberRole(
  membershipId: string,
  orgId: string,
  newRole: "OWNER" | "ADMIN" | "MANAGER" | "AUDITOR" | "USER"
): Promise<MemberActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const caller = await getCallerMembership(orgId, session.user.id);
  if (!caller || !["OWNER", "ADMIN"].includes(caller.role)) {
    return { status: "error", message: "Only OWNER or ADMIN can change roles." };
  }

  const target = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.id, membershipId),
    with: { user: true },
  });
  if (!target || target.organizationId !== orgId) {
    return { status: "error", message: "Member not found." };
  }

  // Can't modify someone of equal or higher rank (unless you're OWNER)
  if (
    caller.role !== "OWNER" &&
    ROLE_RANK[target.role] >= ROLE_RANK[caller.role]
  ) {
    return { status: "error", message: "You cannot change the role of someone with equal or higher rank." };
  }

  // Can't assign a role higher than your own (unless you're OWNER)
  if (
    caller.role !== "OWNER" &&
    ROLE_RANK[newRole] >= ROLE_RANK[caller.role]
  ) {
    return { status: "error", message: "You cannot assign a role equal to or higher than your own." };
  }

  await db
    .update(organizationMemberships)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(organizationMemberships.id, membershipId));

  await createAuditEvent({
    organizationId: orgId,
    actorId: session.user.id,
    eventType: "ROLE_ASSIGNED",
    resourceType: "membership",
    resourceId: membershipId,
    description: `Role changed to ${newRole} for ${(target as typeof target & { user: { name: string } }).user?.name ?? "member"}`,
  });

  revalidatePath(`/dashboard/orgs/${orgId}/members`);
  return { status: "success" };
}

// ─── Remove member ────────────────────────────────────────────────────────────

export async function removeMember(
  membershipId: string,
  orgId: string
): Promise<MemberActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const caller = await getCallerMembership(orgId, session.user.id);
  if (!caller || !["OWNER", "ADMIN"].includes(caller.role)) {
    return { status: "error", message: "Only OWNER or ADMIN can remove members." };
  }

  const target = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.id, membershipId),
    with: { user: true },
  });
  if (!target || target.organizationId !== orgId) {
    return { status: "error", message: "Member not found." };
  }

  // Can't remove yourself
  if (target.userId === session.user.id) {
    return { status: "error", message: "You cannot remove yourself." };
  }

  // Can't remove someone of equal or higher rank (unless you're OWNER)
  if (
    caller.role !== "OWNER" &&
    ROLE_RANK[target.role] >= ROLE_RANK[caller.role]
  ) {
    return { status: "error", message: "You cannot remove someone with equal or higher rank." };
  }

  await db
    .update(organizationMemberships)
    .set({ status: "REMOVED", updatedAt: new Date() })
    .where(eq(organizationMemberships.id, membershipId));

  await createAuditEvent({
    organizationId: orgId,
    actorId: session.user.id,
    eventType: "MEMBER_REMOVED",
    resourceType: "membership",
    resourceId: membershipId,
    description: `Member ${(target as typeof target & { user: { name: string } }).user?.name ?? ""} removed from organization`,
  });

  revalidatePath(`/dashboard/orgs/${orgId}/members`);
  return { status: "success" };
}

// ─── Revoke invitation ────────────────────────────────────────────────────────

export async function revokeInvitation(
  invitationId: string,
  orgId: string
): Promise<MemberActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Not authenticated." };

  const caller = await getCallerMembership(orgId, session.user.id);
  if (!caller || !["OWNER", "ADMIN"].includes(caller.role)) {
    return { status: "error", message: "Access denied." };
  }

  const inv = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.id, invitationId),
      eq(invitations.organizationId, orgId)
    ),
  });
  if (!inv) return { status: "error", message: "Invitation not found." };

  await db
    .update(invitations)
    .set({ status: "REVOKED" })
    .where(eq(invitations.id, invitationId));

  revalidatePath(`/dashboard/orgs/${orgId}/members`);
  return { status: "success" };
}
