import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getMembership, getOrganizationById } from "@/db/queries/organizations";
import { getOrgAuditEvents } from "@/db/queries/audit";
import { isAlgorandConfigured } from "@/lib/algorand/client";
import { AuditClient } from "./audit-client";

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function AuditPage({ params }: Props) {
  const { orgId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationById(orgId),
    getMembership(orgId, session.user.id),
  ]);

  if (!org || !membership || membership.status !== "ACTIVE") notFound();

  const events = await getOrgAuditEvents(orgId, 100);
  const canAnchor = ["OWNER", "ADMIN"].includes(membership.role) && isAlgorandConfigured();

  return (
    <AuditClient
      orgId={orgId}
      orgName={org.name}
      canAnchor={canAnchor}
      events={events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        description: e.description,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        blockchainTxId: e.blockchainTxId,
        ipfsCid: e.ipfsCid,
        createdAt: e.createdAt.toISOString(),
        actor: e.actor ? { name: e.actor.name, id: e.actor.id } : null,
      }))}
    />
  );
}
