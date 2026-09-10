import { auth } from "@/lib/auth";
import { db } from "@/db";
import { credentials, organizations, organizationMemberships, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CredentialsClient } from "./credentials-client";

export default async function CredentialsPage() {
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

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const userDid = user?.did || `did:shield:user:${session.user.id}`;

  // Fetch credentials for organizations user belongs to
  const orgIds = userOrgs.map((o) => o.id);
  
  const allCreds = await db.query.credentials.findMany({
    orderBy: [desc(credentials.issuedAt)],
    with: {
      organization: true,
      issuedBy: true,
    },
  });

  const visibleCreds = allCreds.filter(
    (c) =>
      orgIds.includes(c.organizationId) ||
      c.subjectDid === userDid ||
      Boolean(session?.user?.id && c.issuedById === session.user.id)
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <CredentialsClient
        initialCredentials={visibleCreds}
        userOrgs={userOrgs}
        currentUser={{
          id: session.user.id,
          name: session.user.name || "User",
          did: userDid,
        }}
      />
    </div>
  );
}
