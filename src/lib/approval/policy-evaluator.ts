import { db } from "@/db";
import { approvalPolicies, assets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ApprovalAction, ResolvedPolicy } from "./types";

/**
 * Resolves the matching multi-party approval policy for a specific organization, action, and asset.
 * If no custom policy exists in the database, applies sensible security defaults based on asset classification.
 */
export async function resolveApprovalPolicy(opts: {
  organizationId: string;
  action: ApprovalAction;
  assetId?: string | null;
  assetClassification?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET" | "CRITICAL" | null;
}): Promise<ResolvedPolicy> {
  const { organizationId, action, assetId } = opts;

  let classification = opts.assetClassification;
  if (!classification && assetId) {
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });
    if (asset) {
      classification = asset.classification;
    }
  }

  // 1. Look for explicit matching policy in DB for this org, action, and classification
  if (classification) {
    const customSpecific = await db.query.approvalPolicies.findFirst({
      where: and(
        eq(approvalPolicies.organizationId, organizationId),
        eq(approvalPolicies.action, action),
        eq(approvalPolicies.assetClassification, classification),
        eq(approvalPolicies.isActive, true)
      ),
    });

    if (customSpecific) {
      return {
        policyId: customSpecific.id,
        name: customSpecific.name,
        requiredApprovals: customSpecific.requiredApprovals,
        eligibleRoles: JSON.parse(customSpecific.eligibleRoles || "[]"),
        eligibleUserIds: customSpecific.eligibleUserIds ? JSON.parse(customSpecific.eligibleUserIds) : undefined,
        approvalExpiryHours: customSpecific.approvalExpiryHours,
        allowSelfApproval: customSpecific.allowSelfApproval,
        isCustom: true,
      };
    }
  }

  // 2. Look for action-wide policy (all classifications) for this org
  const customGeneric = await db.query.approvalPolicies.findFirst({
    where: and(
      eq(approvalPolicies.organizationId, organizationId),
      eq(approvalPolicies.action, action),
      eq(approvalPolicies.isActive, true)
    ),
  });

  if (customGeneric) {
    return {
      policyId: customGeneric.id,
      name: customGeneric.name,
      requiredApprovals: customGeneric.requiredApprovals,
      eligibleRoles: JSON.parse(customGeneric.eligibleRoles || "[]"),
      eligibleUserIds: customGeneric.eligibleUserIds ? JSON.parse(customGeneric.eligibleUserIds) : undefined,
      approvalExpiryHours: customGeneric.approvalExpiryHours,
      allowSelfApproval: customGeneric.allowSelfApproval,
      isCustom: true,
    };
  }

  // 3. Sensible Default Rules (Zero-Config Security Defaults)
  switch (classification) {
    case "CRITICAL":
      return {
        name: "Default Critical Multi-Party Quorum (3-of-5)",
        requiredApprovals: 3,
        eligibleRoles: ["OWNER", "ADMIN", "MANAGER", "AUDITOR"],
        approvalExpiryHours: 48,
        allowSelfApproval: false,
        isCustom: false,
      };
    case "SECRET":
    case "CONFIDENTIAL":
      return {
        name: "Default Confidential Multi-Party Quorum (2-of-3)",
        requiredApprovals: 2,
        eligibleRoles: ["OWNER", "ADMIN", "MANAGER"],
        approvalExpiryHours: 48,
        allowSelfApproval: false,
        isCustom: false,
      };
    case "INTERNAL":
      return {
        name: "Default Internal Approval (1-of-2)",
        requiredApprovals: 1,
        eligibleRoles: ["OWNER", "ADMIN", "MANAGER"],
        approvalExpiryHours: 72,
        allowSelfApproval: false,
        isCustom: false,
      };
    case "PUBLIC":
    default:
      return {
        name: "Standard Dual-Authorization (1-of-1)",
        requiredApprovals: 1,
        eligibleRoles: ["OWNER", "ADMIN", "MANAGER", "USER"],
        approvalExpiryHours: 72,
        allowSelfApproval: true,
        isCustom: false,
      };
  }
}
