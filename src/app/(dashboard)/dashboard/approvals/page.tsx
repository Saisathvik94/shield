import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  approvalRequests,
  approvalPolicies,
  organizationMemberships,
  users,
  walletIdentities,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ApprovalsClient } from "./approvals-client";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user organizations
  const memberships = await db.query.organizationMemberships.findMany({
    where: eq(organizationMemberships.userId, session.user.id),
    with: { organization: true },
  });

  const userOrgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
  }));

  const orgIds = userOrgs.map((o) => o.id);

  if (orgIds.length === 0) {
    redirect("/dashboard/orgs/new");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const wallet = await db.query.walletIdentities.findFirst({
    where: eq(walletIdentities.userId, session.user.id),
  });

  const userDid = user?.did || `did:shield:user:${session.user.id}`;

  // Fetch approval requests for user's organizations
  const requests = await db.query.approvalRequests.findMany({
    where: inArray(approvalRequests.organizationId, orgIds),
    orderBy: [desc(approvalRequests.createdAt)],
    with: {
      organization: true,
      asset: true,
      requestedBy: true,
      currentCustodian: true,
      requestedCustodian: true,
      rejectedBy: true,
      signatures: {
        with: {
          approver: true,
        },
      },
    },
  });

  // Fetch approval policies for user's organizations
  const policies = await db.query.approvalPolicies.findMany({
    where: inArray(approvalPolicies.organizationId, orgIds),
    orderBy: [desc(approvalPolicies.createdAt)],
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <ApprovalsClient
        initialRequests={requests as any}
        initialPolicies={policies as any}
        userOrgs={userOrgs}
        currentUser={{
          id: session.user.id,
          name: session.user.name || "User",
          email: session.user.email || "",
          did: userDid,
          walletAddress: wallet?.walletAddress || null,
        }}
      />
    </div>
  );
}
