import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  getOrganizationById,
  getMembership,
  getDepartments,
  getOrganizationMembers,
} from "@/db/queries/organizations";
import { OrgSettingsClient } from "./settings-client";

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function OrgSettingsPage({ params }: Props) {
  const { orgId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationById(orgId),
    getMembership(orgId, session.user.id),
  ]);

  if (!org || !membership || membership.status !== "ACTIVE") notFound();

  const [departments, allMembers] = await Promise.all([
    getDepartments(orgId),
    getOrganizationMembers(orgId),
  ]);

  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

  return (
    <OrgSettingsClient
      org={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        website: org.website,
        algorandAppId: org.algorandAppId,
        createdAt: org.createdAt.toISOString(),
      }}
      departments={departments.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        headId: d.headId,
        members: d.members,
      }))}
      allMembers={allMembers.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
      }))}
      isAdmin={isAdmin}
    />
  );
}
