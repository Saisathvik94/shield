"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  organizationMemberships,
  memberAssignments,
  departments,
  credentials,
  auditEvents,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { computeCanonicalSha256 } from "@/lib/crypto/canonicalize";

export interface BulkMemberRow {
  name: string;
  email: string;
  role?: "OWNER" | "ADMIN" | "MANAGER" | "AUDITOR" | "USER";
  clearanceLevel?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET";
  designation?: string;
  employeeId?: string;
}

export interface BulkOnboardResult {
  success: boolean;
  totalProcessed: number;
  addedCount: number;
  updatedCount: number;
  errors: string[];
}

export async function bulkOnboardDepartmentMembersAction(
  organizationId: string,
  departmentId: string,
  rows: BulkMemberRow[]
): Promise<BulkOnboardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      totalProcessed: 0,
      addedCount: 0,
      updatedCount: 0,
      errors: ["Authentication required to perform bulk onboarding."],
    };
  }

  // Verify Admin/Owner role
  const adminMembership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.status, "ACTIVE")
    ),
  });

  if (!adminMembership || !["OWNER", "ADMIN"].includes(adminMembership.role)) {
    return {
      success: false,
      totalProcessed: 0,
      addedCount: 0,
      updatedCount: 0,
      errors: ["You do not have permission to perform bulk onboarding for this organization."],
    };
  }

  const dept = await db.query.departments.findFirst({
    where: and(
      eq(departments.id, departmentId),
      eq(departments.organizationId, organizationId)
    ),
  });

  if (!dept) {
    return {
      success: false,
      totalProcessed: 0,
      addedCount: 0,
      updatedCount: 0,
      errors: ["Selected department was not found."],
    };
  }

  let addedCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = row.email?.trim().toLowerCase();
    const name = row.name?.trim() || email.split("@")[0] || "Employee";
    const role = row.role || "USER";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${i + 1}: Invalid email address "${row.email}"`);
      continue;
    }

    try {
      // 1. Find or create user
      let user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        const pendingDid = `did:shield:user:pending-${randomUUID()}`;
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            name,
            did: pendingDid,
          })
          .returning();
        user = newUser;
      }

      // 2. Find or create membership
      let membership = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, user.id)
        ),
      });

      if (!membership) {
        const [newMembership] = await db
          .insert(organizationMemberships)
          .values({
            organizationId,
            userId: user.id,
            role,
            status: "ACTIVE",
            joinedAt: new Date(),
          })
          .returning();
        membership = newMembership;
        addedCount++;
      } else {
        await db
          .update(organizationMemberships)
          .set({
            role,
            status: "ACTIVE",
            updatedAt: new Date(),
          })
          .where(eq(organizationMemberships.id, membership.id));
        updatedCount++;
      }

      // 3. Bind to Department Assignment
      const existingAssignment = await db.query.memberAssignments.findFirst({
        where: eq(memberAssignments.membershipId, membership.id),
      });

      if (existingAssignment) {
        await db
          .update(memberAssignments)
          .set({
            departmentId: dept.id,
          })
          .where(eq(memberAssignments.id, existingAssignment.id));
      } else {
        await db.insert(memberAssignments).values({
          membershipId: membership.id,
          departmentId: dept.id,
        });
      }

      // 4. Issue W3C Clearance Credential if clearanceLevel provided
      if (row.clearanceLevel) {
        const claims = {
          id: user.did || `did:shield:user:${user.id}`,
          employeeId: row.employeeId || `EMP-${randomUUID().slice(0, 8).toUpperCase()}`,
          name: user.name,
          email: user.email,
          organization: dept.name,
          clearanceLevel: row.clearanceLevel,
          designation: row.designation || "Staff",
        };

        const canonicalHash = computeCanonicalSha256(claims);
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

        await db.insert(credentials).values({
          type: "ROLE_ASSIGNMENT",
          issuerDid: `did:shield:org:${organizationId}`,
          subjectDid: user.did || `did:shield:user:${user.id}`,
          organizationId,
          issuedById: session.user.id,
          claims: JSON.stringify(claims),
          credentialHash: canonicalHash,
          status: "ACTIVE",
          issuedAt: new Date(),
          expiresAt,
        });
      }
    } catch (err: any) {
      errors.push(`Row ${i + 1} (${email}): ${err.message}`);
    }
  }

  // Audit log
  try {
    await db.insert(auditEvents).values({
      organizationId,
      actorId: session.user.id,
      eventType: "ROLE_ASSIGNED",
      resourceType: "department",
      resourceId: dept.id,
      description: `Bulk onboarded ${addedCount} new and updated ${updatedCount} members into department "${dept.name}" (Pending Wallet Binding).`,
      metadata: JSON.stringify({
        departmentId: dept.id,
        departmentName: dept.name,
        addedCount,
        updatedCount,
        totalRows: rows.length,
      }),
    });
  } catch (err) {
    console.error("Audit log error on bulk onboarding:", err);
  }

  revalidatePath(`/dashboard/orgs/${organizationId}/members`);
  revalidatePath(`/dashboard/orgs/${organizationId}`);

  return {
    success: errors.length < rows.length,
    totalProcessed: rows.length,
    addedCount,
    updatedCount,
    errors,
  };
}
