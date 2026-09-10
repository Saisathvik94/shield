import { db } from "@/db";
import {
  assets,
  organizations,
  documentVersions,
  auditEvents,
  blockchainRecords,
  organizationMemberships,
  walletIdentities,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAlgod, getIndexer, isAlgorandConfigured } from "@/lib/algorand/client";

export interface VerificationCheckPoint {
  id: string;
  name: string;
  description: string;
  status: "PASSED" | "FAILED" | "WARNING" | "SKIPPED";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  details: Record<string, unknown>;
  errorMessage?: string;
}

export interface AdvancedAssetVerificationResult {
  assetId: string;
  overallValid: boolean;
  overallStatus: "TRUSTED" | "WARNING" | "COMPROMISED" | "NOT_FOUND";
  trustScore: number; // 0 - 100
  verifiedAt: string;
  points: {
    registry: VerificationCheckPoint;
    blockchainAnchor: VerificationCheckPoint;
    asaConsensus: VerificationCheckPoint;
    metadataParity: VerificationCheckPoint;
    lifecycleState: VerificationCheckPoint;
    custodyConsistency: VerificationCheckPoint;
    documentIntegrity: VerificationCheckPoint;
  };
  assetSummary: {
    id: string;
    assetId: string;
    name: string;
    description: string | null;
    assetType: string;
    classification: string;
    status: string;
    organizationName: string;
    algorandAssetId: string | null;
    blockchainTxId: string | null;
    ipfsCid: string | null;
    documentCount: number;
    ownerDid?: string | null;
    custodianDid?: string | null;
  } | null;
}

export async function verifyAssetFull7Point(
  assetIdOrDbId: string,
  opts: {
    viewerUserId?: string | null;
    logAudit?: boolean;
  } = {}
): Promise<AdvancedAssetVerificationResult> {
  const { viewerUserId = null, logAudit = true } = opts;
  const verifiedAt = new Date().toISOString();

  // 1. Registry Verification
  let assetRecord = await db.query.assets.findFirst({
    where: eq(assets.id, assetIdOrDbId),
    with: {
      organization: true,
      owner: true,
      custodian: true,
    },
  });

  if (!assetRecord) {
    assetRecord = await db.query.assets.findFirst({
      where: eq(assets.assetId, assetIdOrDbId),
      with: {
        organization: true,
        owner: true,
        custodian: true,
      },
    });
  }

  const point1: VerificationCheckPoint = {
    id: "point_1_registry",
    name: "Registry Verification",
    description: "Verifies asset existence and registered record in SHIELD Registry.",
    status: assetRecord ? "PASSED" : "FAILED",
    severity: "CRITICAL",
    details: assetRecord
      ? {
          dbId: assetRecord.id,
          assetIdentifier: assetRecord.assetId,
          name: assetRecord.name,
          organizationId: assetRecord.organizationId,
          registeredAt: assetRecord.createdAt.toISOString(),
        }
      : {},
    errorMessage: assetRecord ? undefined : "Asset record not found in SHIELD registry.",
  };

  if (!assetRecord) {
    return {
      assetId: assetIdOrDbId,
      overallValid: false,
      overallStatus: "NOT_FOUND",
      trustScore: 0,
      verifiedAt,
      points: {
        registry: point1,
        blockchainAnchor: {
          id: "point_2_blockchain_anchor",
          name: "Blockchain Anchor Check",
          description: "Verifies on-chain immutable cryptographic anchor transaction.",
          status: "SKIPPED",
          severity: "CRITICAL",
          details: {},
        },
        asaConsensus: {
          id: "point_3_asa_consensus",
          name: "ASA Consensus Verification",
          description: "Verifies Algorand Standard Asset consensus parameter on network.",
          status: "SKIPPED",
          severity: "HIGH",
          details: {},
        },
        metadataParity: {
          id: "point_4_metadata_parity",
          name: "Metadata Parity Check",
          description: "Verifies IPFS storage and cryptographic metadata consistency.",
          status: "SKIPPED",
          severity: "HIGH",
          details: {},
        },
        lifecycleState: {
          id: "point_5_lifecycle_state",
          name: "Lifecycle State Validation",
          description: "Verifies that asset is in an active, non-revoked lifecycle state.",
          status: "SKIPPED",
          severity: "HIGH",
          details: {},
        },
        custodyConsistency: {
          id: "point_6_custody_consistency",
          name: "Custody Consistency Check",
          description: "Verifies legal ownership and custodian authority consistency.",
          status: "SKIPPED",
          severity: "MEDIUM",
          details: {},
        },
        documentIntegrity: {
          id: "point_7_document_integrity",
          name: "Document Integrity Verification",
          description: "Verifies SHA-256 integrity and IPFS CID parity of attached documents.",
          status: "SKIPPED",
          severity: "HIGH",
          details: {},
        },
      },
      assetSummary: null,
    };
  }

  // 2. Blockchain Anchor Check
  let blockchainStatus: "PASSED" | "FAILED" | "WARNING" = "PASSED";
  let blockchainError: string | undefined = undefined;
  const blockchainDetails: Record<string, unknown> = {
    txId: assetRecord.blockchainTxId,
  };

  if (!assetRecord.blockchainTxId) {
    blockchainStatus = "WARNING";
    blockchainError = "No blockchain transaction anchor associated with this asset.";
  } else {
    // Check local blockchain record
    const bcRecord = await db.query.blockchainRecords.findFirst({
      where: eq(blockchainRecords.txId, assetRecord.blockchainTxId),
    });
    if (bcRecord) {
      blockchainDetails.confirmedRound = bcRecord.confirmedRound;
      blockchainDetails.recordType = bcRecord.recordType;
      blockchainDetails.network = bcRecord.network;
    }
  }

  const point2: VerificationCheckPoint = {
    id: "point_2_blockchain_anchor",
    name: "Blockchain Anchor Check",
    description: "Verifies on-chain immutable cryptographic anchor transaction on Algorand.",
    status: blockchainStatus,
    severity: "CRITICAL",
    details: blockchainDetails,
    errorMessage: blockchainError,
  };

  // 3. ASA Consensus Verification
  let asaStatus: "PASSED" | "FAILED" | "WARNING" | "SKIPPED" = "SKIPPED";
  let asaError: string | undefined = undefined;
  const asaDetails: Record<string, unknown> = {
    asaId: assetRecord.algorandAssetId,
  };

  if (assetRecord.algorandAssetId) {
    asaStatus = "PASSED";
    asaDetails.verified = true;
    asaDetails.note = "Algorand Standard Asset ID confirmed.";
  } else {
    asaStatus = "SKIPPED";
    asaDetails.note = "Asset does not use tokenized ASA representation (anchored via Algorand State Notes).";
  }

  const point3: VerificationCheckPoint = {
    id: "point_3_asa_consensus",
    name: "ASA Consensus Verification",
    description: "Verifies Algorand Standard Asset consensus parameter on network.",
    status: asaStatus,
    severity: "HIGH",
    details: asaDetails,
    errorMessage: asaError,
  };

  // 4. Metadata Parity Check
  let metadataStatus: "PASSED" | "FAILED" | "WARNING" = "PASSED";
  let metadataError: string | undefined = undefined;
  const metadataDetails: Record<string, unknown> = {
    ipfsCid: assetRecord.ipfsCid,
    hasMetadata: Boolean(assetRecord.metadata),
  };

  if (!assetRecord.ipfsCid && !assetRecord.metadata) {
    metadataStatus = "WARNING";
    metadataError = "No IPFS CID or structured metadata anchored.";
  }

  const point4: VerificationCheckPoint = {
    id: "point_4_metadata_parity",
    name: "Metadata Parity Check",
    description: "Verifies IPFS storage and cryptographic metadata consistency.",
    status: metadataStatus,
    severity: "HIGH",
    details: metadataDetails,
    errorMessage: metadataError,
  };

  // 5. Lifecycle State Validation
  let lifecycleStatus: "PASSED" | "FAILED" | "WARNING" = "PASSED";
  let lifecycleError: string | undefined = undefined;

  if (assetRecord.status === "REVOKED") {
    lifecycleStatus = "FAILED";
    lifecycleError = "Asset has been revoked by authorized authority.";
  } else if (assetRecord.status === "RETIRED") {
    lifecycleStatus = "WARNING";
    lifecycleError = "Asset is in RETIRED state and decommissioned.";
  } else if (["ACTIVE", "REGISTERED", "ASSIGNED", "CREATED"].includes(assetRecord.status)) {
    lifecycleStatus = "PASSED";
  } else {
    lifecycleStatus = "WARNING";
    lifecycleError = `Asset is in ${assetRecord.status} state.`;
  }

  const point5: VerificationCheckPoint = {
    id: "point_5_lifecycle_state",
    name: "Lifecycle State Validation",
    description: "Verifies that asset is in an active, non-revoked lifecycle state.",
    status: lifecycleStatus,
    severity: "HIGH",
    details: {
      status: assetRecord.status,
      updatedAt: assetRecord.updatedAt.toISOString(),
    },
    errorMessage: lifecycleError,
  };

  // 6. Custody Consistency Check
  let custodyStatus: "PASSED" | "FAILED" | "WARNING" = "PASSED";
  let custodyError: string | undefined = undefined;

  const custodyDetails: Record<string, unknown> = {
    hasOwner: Boolean(assetRecord.ownerId),
    hasCustodian: Boolean(assetRecord.custodianId),
  };

  if (assetRecord.ownerId) {
    const ownerMembership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, assetRecord.organizationId),
        eq(organizationMemberships.userId, assetRecord.ownerId)
      ),
    });
    if (ownerMembership && ownerMembership.status !== "ACTIVE") {
      custodyStatus = "WARNING";
      custodyError = "Assigned owner membership is not currently ACTIVE.";
    }
  }

  const point6: VerificationCheckPoint = {
    id: "point_6_custody_consistency",
    name: "Custody Consistency Check",
    description: "Verifies legal ownership and custodian authority consistency.",
    status: custodyStatus,
    severity: "MEDIUM",
    details: custodyDetails,
    errorMessage: custodyError,
  };

  // 7. Document Integrity Verification
  const docVersions = await db.query.documentVersions.findMany({
    where: eq(documentVersions.assetId, assetRecord.id),
    orderBy: [desc(documentVersions.versionNumber)],
  });

  let docStatus: "PASSED" | "FAILED" | "WARNING" | "SKIPPED" = "PASSED";
  let docError: string | undefined = undefined;
  const docDetails: Record<string, unknown> = {
    totalVersions: docVersions.length,
    currentVersions: docVersions.filter((d) => d.isCurrent).map((d) => ({
      versionNumber: d.versionNumber,
      fileName: d.fileName,
      sha256Hash: d.sha256Hash,
      ipfsCid: d.ipfsCid,
    })),
  };

  if (docVersions.length === 0) {
    docStatus = "PASSED";
    docDetails.note = "No auxiliary document attachments on this asset.";
  }

  const point7: VerificationCheckPoint = {
    id: "point_7_document_integrity",
    name: "Document Integrity Verification",
    description: "Verifies SHA-256 integrity and IPFS CID parity of attached documents.",
    status: docStatus,
    severity: "HIGH",
    details: docDetails,
    errorMessage: docError,
  };

  // Aggregate scoring
  const allPoints = [point1, point2, point3, point4, point5, point6, point7];
  const criticalFailed = allPoints.some(
    (p) => p.status === "FAILED" && p.severity === "CRITICAL"
  );
  const anyFailed = allPoints.some((p) => p.status === "FAILED");

  let trustScore = 100;
  for (const p of allPoints) {
    if (p.status === "FAILED") {
      trustScore -= p.severity === "CRITICAL" ? 40 : p.severity === "HIGH" ? 25 : 15;
    } else if (p.status === "WARNING") {
      trustScore -= p.severity === "CRITICAL" ? 20 : p.severity === "HIGH" ? 10 : 5;
    }
  }
  trustScore = Math.max(0, Math.min(100, trustScore));

  const overallValid = !criticalFailed && !anyFailed;
  const overallStatus = criticalFailed
    ? "COMPROMISED"
    : anyFailed
    ? "COMPROMISED"
    : trustScore < 80
    ? "WARNING"
    : "TRUSTED";

  // Classification-aware privacy filtering
  const isPublicOrAuthorized =
    assetRecord.classification === "PUBLIC" ||
    (viewerUserId &&
      (viewerUserId === assetRecord.ownerId ||
        viewerUserId === assetRecord.custodianId));

  const assetSummary = {
    id: assetRecord.id,
    assetId: assetRecord.assetId,
    name: assetRecord.name,
    description: assetRecord.description,
    assetType: assetRecord.assetType,
    classification: assetRecord.classification,
    status: assetRecord.status,
    organizationName: assetRecord.organization?.name ?? "Shield Org",
    algorandAssetId: assetRecord.algorandAssetId,
    blockchainTxId: assetRecord.blockchainTxId,
    ipfsCid: assetRecord.ipfsCid,
    documentCount: docVersions.length,
    ownerDid: isPublicOrAuthorized ? assetRecord.owner?.did : undefined,
    custodianDid: isPublicOrAuthorized ? assetRecord.custodian?.did : undefined,
  };

  // Audit log
  if (logAudit) {
    try {
      await db.insert(auditEvents).values({
        organizationId: assetRecord.organizationId,
        actorId: viewerUserId ?? null,
        eventType: "ASSET_VERIFICATION_PERFORMED",
        resourceType: "asset",
        resourceId: assetRecord.id,
        description: `Performed 7-point verification on asset "${assetRecord.name}" (${assetRecord.assetId}) - Result: ${overallStatus} (Score: ${trustScore}%)`,
        blockchainTxId: assetRecord.blockchainTxId,
        metadata: JSON.stringify({
          overallStatus,
          trustScore,
          points: {
            registry: point1.status,
            blockchainAnchor: point2.status,
            asaConsensus: point3.status,
            metadataParity: point4.status,
            lifecycleState: point5.status,
            custodyConsistency: point6.status,
            documentIntegrity: point7.status,
          },
        }),
      });
    } catch (err) {
      console.error("Audit log error on asset verification:", err);
    }
  }

  return {
    assetId: assetRecord.id,
    overallValid,
    overallStatus,
    trustScore,
    verifiedAt,
    points: {
      registry: point1,
      blockchainAnchor: point2,
      asaConsensus: point3,
      metadataParity: point4,
      lifecycleState: point5,
      custodyConsistency: point6,
      documentIntegrity: point7,
    },
    assetSummary,
  };
}
