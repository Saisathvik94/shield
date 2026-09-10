"use server";

import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizationMemberships, riskAssessments } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { evaluateAssetRisk } from '@/lib/risk/risk-engine';
import { RiskEvaluationResult } from '@/lib/risk/types';

export async function evaluateAssetRiskAction(params: {
  assetId: string;
  organizationId: string;
  action?: string;
  targetCustodianId?: string;
  persist?: boolean;
}): Promise<{ success: boolean; data?: RiskEvaluationResult; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const { assetId, organizationId, action = 'ASSET_ACCESS', targetCustodianId, persist = true } = params;

    // Verify membership
    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.status, 'ACTIVE')
      ),
    });

    if (!membership) {
      return { success: false, error: 'Access denied to organization.' };
    }

    const result = await evaluateAssetRisk({
      assetId,
      organizationId,
      action,
      requestedById: session.user.id,
      targetCustodianId,
      persist,
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error evaluating asset risk:', error);
    return { success: false, error: error.message || 'Failed to evaluate asset risk' };
  }
}

export async function getLatestRiskAssessmentsAction(params: {
  assetId: string;
  organizationId: string;
  limit?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { assetId, organizationId, limit = 10 } = params;

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.status, 'ACTIVE')
      ),
    });

    if (!membership) {
      return { success: false, error: 'Access denied.' };
    }

    const assessments = await db.query.riskAssessments.findMany({
      where: and(
        eq(riskAssessments.assetId, assetId),
        eq(riskAssessments.organizationId, organizationId)
      ),
      orderBy: [desc(riskAssessments.evaluatedAt)],
      limit,
      with: {
        evaluatedBy: true,
      },
    });

    return { success: true, data: assessments };
  } catch (error: any) {
    console.error('Error fetching risk assessments:', error);
    return { success: false, error: error.message || 'Failed to fetch assessments' };
  }
}
