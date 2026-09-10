import { db } from '@/db';
import {
  assets,
  users,
  walletIdentities,
  credentials,
  documentVersions,
  auditEvents,
  blockchainRecords,
  riskAssessments,
  approvalPolicies,
} from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { createAuditEvent } from '@/db/queries/audit';
import {
  EvaluateRiskParams,
  RiskEvaluationResult,
  RiskLevel,
  PolicyDecision,
  RiskSignal,
} from './types';

/**
 * Deterministic Risk & Trust Engine
 * Evaluates asset state, document integrity, verifiable credentials,
 * Algorand on-chain anchoring, and audit anomaly velocity without heuristics or probabilistic AI.
 */
export async function evaluateAssetRisk(
  params: EvaluateRiskParams
): Promise<RiskEvaluationResult> {
  const {
    assetId,
    organizationId,
    action = 'ASSET_ACCESS',
    requestedById,
    targetCustodianId,
    persist = true,
  } = params;

  const signals: RiskSignal[] = [];
  const blockReasons: string[] = [];
  const approvalReasons: string[] = [];

  // 1. Fetch Asset
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId);
  const asset = isUuid
    ? await db.query.assets.findFirst({
        where: and(eq(assets.id, assetId), eq(assets.organizationId, organizationId)),
      })
    : await db.query.assets.findFirst({
        where: and(eq(assets.assetId, assetId), eq(assets.organizationId, organizationId)),
      });

  if (!asset) {
    throw new Error(`Asset ${assetId} not found in organization ${organizationId}`);
  }

  // -------------------------------------------------------------------------
  // SIGNAL GROUP 1: Asset Classification & State
  // -------------------------------------------------------------------------
  const classification = asset.classification;
  if (classification === 'SECRET') {
    signals.push({
      code: 'CLASS_SECRET',
      name: 'Secret Asset Classification',
      category: 'CLASSIFICATION',
      severity: 'HIGH',
      scoreImpact: 35,
      description: 'Asset is designated as SECRET critical enterprise infrastructure.',
      mitigation: 'Requires strict multi-party approval quorum before mutations.',
      detected: true,
    });
    approvalReasons.push('SECRET classification mandates multi-party approval');
  } else if (classification === 'CONFIDENTIAL') {
    signals.push({
      code: 'CLASS_CONFIDENTIAL',
      name: 'Confidential Asset Classification',
      category: 'CLASSIFICATION',
      severity: 'MEDIUM',
      scoreImpact: 20,
      description: 'Asset is designated as CONFIDENTIAL security level.',
      mitigation: 'Sensitive operations require verified administrative approval.',
      detected: true,
    });
  } else if (classification === 'INTERNAL') {
    signals.push({
      code: 'CLASS_INTERNAL',
      name: 'Internal Asset Classification',
      category: 'CLASSIFICATION',
      severity: 'LOW',
      scoreImpact: 10,
      description: 'Asset is standard internal enterprise property.',
      mitigation: 'Standard cryptographic tracking applied.',
      detected: true,
    });
  }

  // Asset Lifecycle Status
  if (asset.status === 'REVOKED' || asset.status === 'RETIRED') {
    signals.push({
      code: 'STATUS_TERMINATED',
      name: 'Asset Lifecycle Terminated',
      category: 'CLASSIFICATION',
      severity: 'CRITICAL',
      scoreImpact: 70,
      description: `Asset is marked as ${asset.status}.`,
      mitigation: 'Terminated assets cannot undergo custody transfers or document updates.',
      detected: true,
    });
    blockReasons.push(`Asset status is ${asset.status}`);
  }

  // -------------------------------------------------------------------------
  // SIGNAL GROUP 2: Algorand On-Chain Anchoring Integrity
  // -------------------------------------------------------------------------
  const onChainGenesis = await db.query.blockchainRecords.findFirst({
    where: and(
      eq(blockchainRecords.resourceId, assetId),
      eq(blockchainRecords.resourceType, 'asset')
    ),
  });

  if (!onChainGenesis || !onChainGenesis.txId) {
    signals.push({
      code: 'CHAIN_ANCHOR_MISSING',
      name: 'Algorand Proof Missing',
      category: 'BLOCKCHAIN',
      severity: 'HIGH',
      scoreImpact: 30,
      description: 'No verified Algorand TestNet blockchain anchor transaction found for this asset.',
      mitigation: 'Anchor asset fingerprint to Algorand ledger to verify timestamp immutability.',
      detected: true,
    });
    approvalReasons.push('Missing on-chain cryptographic anchor');
  } else {
    signals.push({
      code: 'CHAIN_ANCHOR_VERIFIED',
      name: 'Algorand Proof Verified',
      category: 'BLOCKCHAIN',
      severity: 'INFO',
      scoreImpact: 0,
      description: `Cryptographic state anchored at Algorand Tx ${onChainGenesis.txId.slice(0, 12)}...`,
      mitigation: 'None required.',
      detected: true,
      metadata: { txId: onChainGenesis.txId, round: onChainGenesis.confirmedRound },
    });
  }

  // -------------------------------------------------------------------------
  // SIGNAL GROUP 3: Document Versioning & Tamper Detection
  // -------------------------------------------------------------------------
  const docVersions = await db.query.documentVersions.findMany({
    where: and(
      eq(documentVersions.assetId, assetId),
      eq(documentVersions.organizationId, organizationId)
    ),
    orderBy: [desc(documentVersions.versionNumber)],
  });

  let hasUnverifiedDoc = false;
  for (const ver of docVersions) {
    if (!ver.sha256Hash || !ver.ipfsCid) {
      hasUnverifiedDoc = true;
    }
  }

  if (hasUnverifiedDoc) {
    signals.push({
      code: 'DOC_UNVERIFIED',
      name: 'Incomplete Document Hashes',
      category: 'DOCUMENT',
      severity: 'MEDIUM',
      scoreImpact: 20,
      description: 'One or more document attachments have incomplete cryptographic digests.',
      mitigation: 'Re-upload and verify document attachments.',
      detected: true,
    });
    approvalReasons.push('Incomplete document cryptographic hashes');
  } else if (docVersions.length > 0) {
    signals.push({
      code: 'DOC_ALL_VERIFIED',
      name: 'Document Digests Present',
      category: 'DOCUMENT',
      severity: 'INFO',
      scoreImpact: 0,
      description: `All ${docVersions.length} document versions have cryptographic SHA-256 and IPFS anchors.`,
      mitigation: 'None required.',
      detected: true,
    });
  }

  // -------------------------------------------------------------------------
  // SIGNAL GROUP 4: Credential & Identity Verification
  // -------------------------------------------------------------------------
  // Check Custodian
  if (!asset.custodianId) {
    signals.push({
      code: 'NO_CUSTODIAN',
      name: 'Unassigned Custodian',
      category: 'IDENTITY',
      severity: 'HIGH',
      scoreImpact: 25,
      description: 'Asset currently has no assigned responsible custodian.',
      mitigation: 'Assign verified custodian identity before state mutations.',
      detected: true,
    });
    approvalReasons.push('Asset lacks an assigned custodian');
  } else {
    const custodian = await db.query.users.findFirst({
      where: eq(users.id, asset.custodianId),
    });

    const custodianWallet = await db.query.walletIdentities.findFirst({
      where: eq(walletIdentities.userId, asset.custodianId),
    });

    if (!custodianWallet?.walletAddress) {
      signals.push({
        code: 'CUSTODIAN_NO_WALLET',
        name: 'Custodian Wallet Unbound',
        category: 'IDENTITY',
        severity: 'MEDIUM',
        scoreImpact: 20,
        description: `Custodian ${custodian?.name || custodian?.email || 'Unknown'} has no cryptographic Algorand wallet linked.`,
        mitigation: 'Require custodian to bind Algorand wallet for cryptographic attestation.',
        detected: true,
      });
      approvalReasons.push('Current custodian has no linked Algorand wallet');
    }

    if (custodian?.did) {
      const custodianCreds = await db.query.credentials.findMany({
        where: and(
          eq(credentials.subjectDid, custodian.did),
          eq(credentials.organizationId, organizationId)
        ),
      });

      const hasRevoked = custodianCreds.some((c) => c.status === 'REVOKED');
      const hasExpired = custodianCreds.some((c) => c.status === 'EXPIRED');

      if (hasRevoked) {
        signals.push({
          code: 'CUSTODIAN_CRED_REVOKED',
          name: 'Custodian Credential Revoked',
          category: 'CREDENTIAL',
          severity: 'CRITICAL',
          scoreImpact: 45,
          description: `Custodian ${custodian.name || custodian.email} holds one or more REVOKED verifiable credentials.`,
          mitigation: 'Revoke asset custody or re-verify security clearance.',
          detected: true,
        });
        blockReasons.push('Current custodian holds a REVOKED verifiable credential');
      } else if (hasExpired) {
        signals.push({
          code: 'CUSTODIAN_CRED_EXPIRED',
          name: 'Custodian Credential Expired',
          category: 'CREDENTIAL',
          severity: 'MEDIUM',
          scoreImpact: 15,
          description: `Custodian ${custodian.name || custodian.email} has expired credentials.`,
          mitigation: 'Re-issue expired verifiable credential.',
          detected: true,
        });
      }
    }
  }

  // Check Target Custodian (if custody transfer requested)
  if (action === 'ASSET_TRANSFER' && targetCustodianId) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetCustodianId),
    });

    if (!targetUser) {
      signals.push({
        code: 'TARGET_USER_NOT_FOUND',
        name: 'Target Custodian Not Found',
        category: 'IDENTITY',
        severity: 'CRITICAL',
        scoreImpact: 50,
        description: 'Specified target custodian does not exist in system.',
        mitigation: 'Specify valid organization member.',
        detected: true,
      });
      blockReasons.push('Target custodian does not exist');
    } else {
      const targetWallet = await db.query.walletIdentities.findFirst({
        where: eq(walletIdentities.userId, targetUser.id),
      });

      if (!targetWallet?.walletAddress) {
        signals.push({
          code: 'TARGET_NO_WALLET',
          name: 'Target Custodian Unbound Wallet',
          category: 'IDENTITY',
          severity: 'HIGH',
          scoreImpact: 25,
          description: `Target custodian ${targetUser.name || targetUser.email} has no Algorand wallet address.`,
          mitigation: 'Target recipient must connect Algorand wallet before taking custody.',
          detected: true,
        });
        approvalReasons.push('Target custodian has no cryptographic wallet linked');
      }

      if (targetUser.did) {
        const targetCreds = await db.query.credentials.findMany({
          where: and(
            eq(credentials.subjectDid, targetUser.did),
            eq(credentials.organizationId, organizationId)
          ),
        });

        if (targetCreds.some((c) => c.status === 'REVOKED')) {
          signals.push({
            code: 'TARGET_CRED_REVOKED',
            name: 'Target Custodian Credential Revoked',
            category: 'CREDENTIAL',
            severity: 'CRITICAL',
            scoreImpact: 50,
            description: `Target custodian ${targetUser.name || targetUser.email} has a REVOKED security credential.`,
            mitigation: 'Cannot transfer custody to an identity with revoked credentials.',
            detected: true,
          });
          blockReasons.push('Target custodian holds a REVOKED verifiable credential');
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // SIGNAL GROUP 5: Audit Log & Anomaly Velocity
  // -------------------------------------------------------------------------
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentEvents = await db.query.auditEvents.findMany({
    where: and(
      eq(auditEvents.resourceId, assetId),
      gte(auditEvents.createdAt, oneDayAgo)
    ),
    orderBy: [desc(auditEvents.createdAt)],
    limit: 20,
  });

  const suspiciousActions = recentEvents.filter((e) =>
    ['TAMPER_DETECTED', 'ACCESS_DENIED', 'APPROVAL_REJECTED', 'VERIFICATION_FAILED'].includes(e.eventType)
  );

  if (suspiciousActions.length >= 2) {
    signals.push({
      code: 'SUSPICIOUS_AUDIT_VELOCITY',
      name: 'Security Anomalies Detected in Past 24h',
      category: 'AUDIT',
      severity: 'HIGH',
      scoreImpact: 30,
      description: `${suspiciousActions.length} security exceptions/rejections recorded for this asset in the last 24 hours.`,
      mitigation: 'Investigate access logs and require multi-signature authorization.',
      detected: true,
      metadata: { exceptionCount: suspiciousActions.length },
    });
    approvalReasons.push('Elevated security anomalies detected in recent audit log');
  }

  // -------------------------------------------------------------------------
  // 6. Compute Deterministic Risk & Trust Score
  // -------------------------------------------------------------------------
  let rawRiskScore = 0;
  for (const s of signals) {
    if (s.detected) {
      rawRiskScore += s.scoreImpact;
    }
  }

  // Clamped 0 - 100
  const riskScore = Math.min(100, Math.max(0, rawRiskScore));
  const trustScore = 100 - riskScore;

  // Determine Risk Level: LOW | MODERATE | ELEVATED | HIGH | CRITICAL
  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 80) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 60) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 40) {
    riskLevel = 'ELEVATED';
  } else if (riskScore >= 20) {
    riskLevel = 'MODERATE';
  }

  // Determine Recommended Quorum
  let recommendedQuorum = 1;
  if (riskLevel === 'CRITICAL') {
    recommendedQuorum = 3;
  } else if (riskLevel === 'HIGH' || classification === 'SECRET') {
    recommendedQuorum = 2;
  } else if (riskLevel === 'ELEVATED' || riskLevel === 'MODERATE') {
    recommendedQuorum = 2;
  }

  // Check Organization Policy Override for Quorum
  const validApprovalActions = [
    'ASSET_TRANSFER',
    'ASSET_ASSIGN',
    'ASSET_REVOKE',
    'ASSET_RETIRE',
    'DOCUMENT_UPDATE',
    'CREDENTIAL_ISSUE',
    'CREDENTIAL_REVOKE',
  ];

  if (validApprovalActions.includes(action)) {
    const matchingPolicy = await db.query.approvalPolicies.findFirst({
      where: and(
        eq(approvalPolicies.organizationId, organizationId),
        eq(approvalPolicies.action, action as any),
        eq(approvalPolicies.isActive, true)
      ),
    });

    if (matchingPolicy) {
      recommendedQuorum = Math.max(recommendedQuorum, matchingPolicy.requiredApprovals);
    }
  }

  // -------------------------------------------------------------------------
  // 7. Policy Decision: ALLOW | REQUIRE_APPROVAL | BLOCK
  // -------------------------------------------------------------------------
  let decision: PolicyDecision = 'ALLOW';

  if (blockReasons.length > 0 || riskScore >= 75) {
    decision = 'BLOCK';
  } else if (
    approvalReasons.length > 0 ||
    riskScore >= 25 ||
    classification === 'SECRET' ||
    classification === 'CONFIDENTIAL' ||
    ['ASSET_TRANSFER', 'ASSET_REVOKE', 'CREDENTIAL_REVOKE', 'DOCUMENT_UPDATE'].includes(action)
  ) {
    decision = 'REQUIRE_APPROVAL';
  } else {
    decision = 'ALLOW';
  }

  const evaluationResult: RiskEvaluationResult = {
    assetId,
    organizationId,
    action,
    riskScore,
    trustScore,
    riskLevel,
    decision,
    recommendedQuorum,
    signals,
    blockReasons,
    approvalReasons,
    evaluatedAt: new Date().toISOString(),
  };

  // -------------------------------------------------------------------------
  // 8. Persist Risk Assessment & Audit Logging
  // -------------------------------------------------------------------------
  if (persist) {
    const [inserted] = await db
      .insert(riskAssessments)
      .values({
        organizationId,
        assetId,
        action,
        riskScore,
        riskLevel,
        decision,
        recommendedQuorum,
        signalsBreakdown: JSON.stringify(signals),
        evaluatedById: requestedById || null,
      })
      .returning();

    evaluationResult.assessmentId = inserted.id;

    // Log Audit Event based on Decision
    if (decision === 'BLOCK') {
      await createAuditEvent({
        organizationId,
        actorId: requestedById || null,
        resourceType: 'asset',
        resourceId: assetId,
        eventType: 'RISK_EVALUATED',
        description: `Gated action ${action} blocked by Risk Engine: ${blockReasons.join(', ')}`,
        metadata: JSON.stringify({
          decision: 'BLOCK',
          riskScore,
          riskLevel,
          blockReasons,
          assessmentId: inserted.id,
        }),
      });
    } else if (riskScore >= 50) {
      await createAuditEvent({
        organizationId,
        actorId: requestedById || null,
        resourceType: 'asset',
        resourceId: assetId,
        eventType: 'RISK_EVALUATED',
        description: `High risk threshold (${riskScore}/100) exceeded during ${action} evaluation`,
        metadata: JSON.stringify({
          decision,
          riskScore,
          riskLevel,
          assessmentId: inserted.id,
        }),
      });
    } else {
      await createAuditEvent({
        organizationId,
        actorId: requestedById || null,
        resourceType: 'asset',
        resourceId: assetId,
        eventType: 'RISK_EVALUATED',
        description: `Risk evaluated for ${action}: Score ${riskScore}/100 (${riskLevel}) - Decision: ${decision}`,
        metadata: JSON.stringify({
          riskScore,
          trustScore,
          riskLevel,
          decision,
          recommendedQuorum,
          assessmentId: inserted.id,
        }),
      });
    }
  }

  return evaluationResult;
}
