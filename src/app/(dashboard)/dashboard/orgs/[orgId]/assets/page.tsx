import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getMembership, getOrganizationById, getDepartments } from "@/db/queries/organizations";
import { getOrgAssets } from "@/lib/actions/asset-actions";
import { AssetsClient } from "./assets-client";

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function AssetsPage({ params }: Props) {
  const { orgId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationById(orgId),
    getMembership(orgId, session.user.id),
  ]);

  if (!org || !membership || membership.status !== "ACTIVE") notFound();

  const [assets, departments] = await Promise.all([
    getOrgAssets(orgId),
    getDepartments(orgId),
  ]);

  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(membership.role);

  return (
    <AssetsClient
      orgId={orgId}
      orgName={org.name}
      assets={assets.map((a) => {
        const asset = a as typeof a & {
          owner: { name: string; email: string } | null;
          custodian: { name: string; email: string } | null;
          department: { name: string } | null;
        };
        return {
          id: asset.id,
          assetId: asset.assetId,
          name: asset.name,
          description: asset.description,
          assetType: asset.assetType,
          classification: asset.classification,
          status: asset.status,
          location: asset.location,
          algorandAssetId: asset.algorandAssetId,
          ipfsCid: asset.ipfsCid,
          createdAt: asset.createdAt.toISOString(),
          owner: asset.owner ? { name: asset.owner.name, email: asset.owner.email } : null,
          custodian: asset.custodian
            ? { name: asset.custodian.name, email: asset.custodian.email }
            : null,
          department: asset.department ? asset.department.name : null,
        };
      })}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      canManage={canManage}
    />
  );
}
