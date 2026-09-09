"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invitations, organizationMemberships, memberAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createAuditEvent } from "@/db/queries/audit";

export type InviteActionResult =
  | { status: "success"; token: string }
  | { status: "needs_login" }
  | { status: "error"; message: string };

export async function acceptInvitation(token: string): Promise<InviteActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "needs_login" };
  }

  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
  });

  if (!invitation) return { status: "error", message: "Invitation not found." };
  if (invitation.status !== "PENDING")
    return { status: "error", message: "This invitation has already been used." };
  if (new Date(invitation.expiresAt) < new Date())
    return { status: "error", message: "This invitation has expired." };

  const userId = session.user.id;

  // Check if already a member
  const existing = await db.query.organizationMemberships.findFirst({
    where: (m, { and, eq }) =>
      and(
        eq(m.organizationId, invitation.organizationId),
        eq(m.userId, userId)
      ),
  });

  if (existing) {
    await db
      .update(invitations)
      .set({ status: "ACCEPTED", acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    return { status: "success", token };
  }

  // Create membership + optional assignment in a transaction
  await db.transaction(async (tx) => {
    const [membership] = await tx
      .insert(organizationMemberships)
      .values({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        status: "ACTIVE",
        joinedAt: new Date(),
      })
      .returning();

    // Create department/section/team assignment if specified
    if (
      invitation.departmentId ||
      invitation.sectionId ||
      invitation.teamId
    ) {
      await tx.insert(memberAssignments).values({
        membershipId: membership.id,
        departmentId: invitation.departmentId ?? undefined,
        sectionId: invitation.sectionId ?? undefined,
        teamId: invitation.teamId ?? undefined,
      });
    }

    await tx
      .update(invitations)
      .set({ status: "ACCEPTED", acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
  });

  await createAuditEvent({
    organizationId: invitation.organizationId,
    actorId: userId,
    eventType: "MEMBER_JOINED",
    resourceType: "membership",
    resourceId: invitation.organizationId,
    description: `User accepted invitation and joined with role ${invitation.role}`,
  });

  return { status: "success", token };
}

export async function sendInvitation(data: {
  organizationId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "AUDITOR" | "USER";
  departmentId?: string;
  sectionId?: string;
  teamId?: string;
}): Promise<InviteActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { status: "error", message: "Not authenticated." };

  // Verify sender has permission (ADMIN or OWNER)
  const senderMembership = await db.query.organizationMemberships.findFirst({
    where: (m, { and, eq }) =>
      and(
        eq(m.organizationId, data.organizationId),
        eq(m.userId, session.user!.id as string),
        eq(m.status, "ACTIVE")
      ),
  });

  if (
    !senderMembership ||
    !["OWNER", "ADMIN"].includes(senderMembership.role)
  ) {
    return {
      status: "error",
      message: "You don't have permission to invite members.",
    };
  }

  const { randomUUID } = await import("crypto");
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(invitations).values({
    organizationId: data.organizationId,
    invitedById: session.user.id as string,
    email: data.email.toLowerCase(),
    role: data.role,
    departmentId: data.departmentId,
    sectionId: data.sectionId,
    teamId: data.teamId,
    token,
    expiresAt,
  });

  await createAuditEvent({
    organizationId: data.organizationId,
    actorId: session.user.id as string,
    eventType: "MEMBER_INVITED",
    resourceType: "invitation",
    description: `Invitation sent to ${data.email} with role ${data.role}`,
  });

  return { status: "success", token };
}
