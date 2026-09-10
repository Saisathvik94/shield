import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAssetInfo } from "@/lib/algorand/indexer-queries";
import { getAssetBlockchainRecords } from "@/db/queries/assets";
import { isAlgorandConfigured } from "@/lib/algorand/client";
import { VerificationClient } from "./verification-client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ assetId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { assetId } = await params;
  return {
    title: `Verify ${decodeURIComponent(assetId)} - SHIELD`,
    description: `On-chain verification for asset ${decodeURIComponent(assetId)} on the SHIELD platform.`,
  };
}

export default async function VerifyPage({ params }: Props) {
  const { assetId: rawId } = await params;
  const assetId = decodeURIComponent(rawId).toUpperCase();

  // Look up by human-readable asset ID (e.g. RADAR-001)
  const assetRaw = await db.query.assets.findFirst({
    where: eq(assets.assetId, assetId),
    with: {
      organization: true,
      owner: true,
      custodian: true,
      department: true,
      section: true,
    },
  });

  if (!assetRaw) notFound();

  // Cast to include relation types
  const asset = assetRaw as typeof assetRaw & {
    organization: { id: string; name: string; slug: string };
    owner: { name: string } | null;
    custodian: { name: string } | null;
    department: { name: string } | null;
    section: { name: string } | null;
  };

  // Blockchain records from our DB
  const blockchainRecords = await getAssetBlockchainRecords(asset.id);

  // Live Algorand Indexer check (if configured and asset is tokenised)
  let onChainInfo = null;
  let indexerError = false;
  if (asset.algorandAssetId && isAlgorandConfigured()) {
    try {
      onChainInfo = await getAssetInfo(asset.algorandAssetId);
    } catch {
      indexerError = true;
    }
  }

  // Determine overall verification status
  const hasDbRecord = true; // always - we fetched it
  const hasBlockchainAnchor = blockchainRecords.length > 0;
  const hasOnChainAsset = !!onChainInfo && !onChainInfo.deleted;
  const isConsistent =
    !onChainInfo ||
    (onChainInfo.unitName.toUpperCase().startsWith(asset.assetId.slice(0, 8)) ||
      onChainInfo.name.toLowerCase().includes(asset.name.toLowerCase().slice(0, 10)));

  const verificationStatus: "verified" | "partial" | "unregistered" =
    hasBlockchainAnchor && hasOnChainAsset
      ? "verified"
      : hasBlockchainAnchor || asset.algorandAssetId
      ? "partial"
      : "unregistered";

  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <VerificationClient
      assetId={assetId}
      verificationStatus={verificationStatus}
      isConsistent={isConsistent}
      indexerError={indexerError}
      isAuthenticated={isAuthenticated}
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
          name: asset.organization.name,
          slug: asset.organization.slug,
        },
        owner: asset.owner
          ? { name: asset.owner.name }
          : null,
        custodian: asset.custodian
          ? { name: asset.custodian.name }
          : null,
        department: asset.department?.name ?? null,
        section: asset.section?.name ?? null,
      }}
      onChainInfo={
        onChainInfo
          ? {
              assetId: onChainInfo.assetId,
              name: onChainInfo.name,
              unitName: onChainInfo.unitName,
              total: onChainInfo.total,
              creator: onChainInfo.creator,
              manager: onChainInfo.manager,
              url: onChainInfo.url,
              createdAtRound: onChainInfo.createdAtRound,
              deleted: onChainInfo.deleted,
            }
          : null
      }
      blockchainRecords={blockchainRecords.map((r) => ({
        txId: r.txId,
        confirmedRound: r.confirmedRound,
        recordType: r.recordType,
        network: r.network,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
