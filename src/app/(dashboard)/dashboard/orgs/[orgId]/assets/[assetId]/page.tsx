import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  getAssetById,
  getAssetIpfsObjects,
  getAssetBlockchainRecords,
  getAssetAuditEvents,
} from "@/db/queries/assets";
import { getOrganizationMembers } from "@/db/queries/organizations";
import { AssetPassportClient } from "./asset-passport-client";

interface Props {
  params: Promise<{ orgId: string; assetId: string }>;
}

export default async function AssetDetailPage({ params }: Props) {
  const { orgId, assetId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await getAssetById(assetId, session.user.id);
  if (!result) notFound();

  const { asset: rawAsset, membership } = result;
  const asset = rawAsset as unknown as {
    id: string; assetId: string; name: string; description: string | null;
    assetType: string; classification: string; status: string;
    location: string | null; physicalIdentifier: string | null;
    algorandAssetId: string | null; blockchainTxId: string | null;
    ipfsCid: string | null; metadata: string | null;
    createdAt: Date; updatedAt: Date;
    organization: { id: string; name: string; slug: string };
    owner: { id: string; name: string; email: string } | null;
    custodian: { id: string; name: string; email: string } | null;
    department: { name: string } | null;
    section: { name: string } | null;
    access: { user: { id: string; name: string; email: string } }[];
  };

  const [ipfsObjects, blockchainRecords, auditEvents, orgMembers] =
    await Promise.all([
      getAssetIpfsObjects(assetId),
      getAssetBlockchainRecords(assetId),
      getAssetAuditEvents(assetId, 20),
      getOrganizationMembers(orgId),
    ]);

  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(membership.role);
  const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes(membership.role);

  // Parse transfer target from metadata if pending
  let transferToUserId: string | null = null;
  let transferReason: string | null = null;
  if (asset.status === "TRANSFER_REQUESTED" && asset.metadata) {
    try {
      const meta = JSON.parse(asset.metadata);
      transferToUserId = meta.transferToUserId ?? null;
      transferReason = meta.transferReason ?? null;
    } catch { /* ignore */ }
  }

  return (
    <AssetPassportClient
      orgId={orgId}
      canManage={canManage}
      isOwnerOrAdmin={isOwnerOrAdmin}
      currentUserId={session.user.id}
      asset={{
        id: asset.id,
        assetId: asset.assetId,
        name: asset.name,
        description: asset.description,
        assetType: asset.assetType,
        classification: asset.classification,
        status: asset.status,
        location: asset.location,
        physicalIdentifier: asset.physicalIdentifier,
        algorandAssetId: asset.algorandAssetId,
        blockchainTxId: asset.blockchainTxId,
        ipfsCid: asset.ipfsCid,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
        organization: {
          id: asset.organization.id,
          name: asset.organization.name,
          slug: asset.organization.slug,
        },
        owner: asset.owner
          ? { id: asset.owner.id, name: asset.owner.name, email: asset.owner.email }
          : null,
        custodian: asset.custodian
          ? { id: asset.custodian.id, name: asset.custodian.name, email: asset.custodian.email }
          : null,
        department: asset.department?.name ?? null,
        section: asset.section?.name ?? null,
        transferToUserId,
        transferReason,
      }}
      orgMembers={orgMembers.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
      }))}
      access={asset.access.map((grant) => ({
        user: { id: grant.user.id, name: grant.user.name, email: grant.user.email },
      }))}
      ipfsObjects={ipfsObjects.map((obj) => ({
        id: obj.id,
        cid: obj.cid,
        gatewayUrl: obj.gatewayUrl,
        objectType: obj.objectType,
        fileName: obj.fileName,
        fileSize: obj.fileSize,
        mimeType: obj.mimeType,
        sha256Hash: obj.sha256Hash,
        createdAt: obj.createdAt.toISOString(),
        uploadedBy: obj.uploadedBy
          ? { name: obj.uploadedBy.name, email: obj.uploadedBy.email }
          : null,
      }))}
      blockchainRecords={blockchainRecords.map((r) => ({
        id: r.id,
        txId: r.txId,
        confirmedRound: r.confirmedRound,
        recordType: r.recordType,
        algorandAssetId: r.algorandAssetId,
        network: r.network,
        notePayload: r.notePayload,
        createdAt: r.createdAt.toISOString(),
        actor: r.actor ? { name: r.actor.name } : null,
      }))}
      auditEvents={auditEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        description: e.description,
        blockchainTxId: e.blockchainTxId,
        ipfsCid: e.ipfsCid,
        createdAt: e.createdAt.toISOString(),
        actor: e.actor ? { name: e.actor.name } : null,
      }))}
    />
  );
}
