import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  getOrganizationById,
  getMembership,
  getOrganizationMembers,
  getDepartments,
  getPendingInvitations,
} from "@/db/queries/organizations";
import { MembersClient } from "./members-client";

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { orgId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationById(orgId),
    getMembership(orgId, session.user.id),
  ]);

  if (!org || !membership || membership.status !== "ACTIVE") notFound();

  const [members, departments, pendingInvites] = await Promise.all([
    getOrganizationMembers(orgId),
    getDepartments(orgId),
    getPendingInvitations(orgId),
  ]);

  const canManage = ["OWNER", "ADMIN"].includes(membership.role);

  return (
    <MembersClient
      orgId={orgId}
      orgName={org.name}
      currentUserId={session.user.id}
      currentUserRole={membership.role}
      canManage={canManage}
      members={members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt?.toISOString() ?? null,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          wallet: m.user.walletIdentities?.[0]?.walletAddress ?? null,
        },
        department:
          (
            m.assignments?.[0] as
              | { department?: { name: string } }
              | undefined
          )?.department?.name ?? null,
        section: null,
      }))}
      departments={departments.map((d) => ({
        id: d.id,
        name: d.name,
      }))}
      pendingInvites={pendingInvites.map((inv) => {
        const typed = inv as typeof inv & {
          invitedBy?: { name: string } | null;
          department?: { name: string } | null;
          section?: { name: string } | null;
        };
        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          token: inv.token,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
          invitedByName: typed.invitedBy?.name ?? null,
          departmentName: typed.department?.name ?? null,
          sectionName: typed.section?.name ?? null,
        };
      })}
    />
  );
}
