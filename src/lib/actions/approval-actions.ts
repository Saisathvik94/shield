"use server";

import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizationMemberships,
  approvalRequests,
  approvalPolicies,
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  createApprovalRequest,
  signApprovalRequest,
  rejectApprovalRequest,
  cancelApprovalRequest,
  getApprovalRequestDetails,
} from '@/lib/approval/approval-manager';
import {
  ApprovalAction,
  ApprovalStatus,
  ApprovalRequestDetail,
} from '@/lib/approval/types';

export async function createApprovalRequestAction(params: {
  organizationId: string;
  assetId?: string;
  action: ApprovalAction;
  targetSubjectId?: string;
  requestedCustodianId?: string;
  customParams?: Record<string, unknown>;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const { organizationId, assetId, action, targetSubjectId, requestedCustodianId, customParams } = params;

    // Check membership
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

    const result = await createApprovalRequest({
      organizationId,
      assetId,
      action,
      requestedById: session.user.id,
      targetSubjectId,
      requestedCustodianId,
      customParams,
    });

    revalidatePath(`/dashboard/approvals`);
    if (assetId) {
      revalidatePath(`/dashboard/orgs/${organizationId}/assets/${assetId}`);
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error creating approval request:', error);
    return { success: false, error: error.message || 'Failed to create approval request' };
  }
}

export async function signApprovalRequestAction(params: {
  approvalRequestId: string;
  walletAddress: string;
  signatureHex: string;
  actionDigest: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const result = await signApprovalRequest({
      approvalRequestId: params.approvalRequestId,
      walletAddress: params.walletAddress,
      signatureHex: params.signatureHex,
      actionDigest: params.actionDigest,
      userId: session.user.id,
    });

    revalidatePath(`/dashboard/approvals`);

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error signing approval request:', error);
    return { success: false, error: error.message || 'Failed to sign approval request' };
  }
}

export async function rejectApprovalRequestAction(params: {
  approvalRequestId: string;
  reason: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const result = await rejectApprovalRequest({
      approvalRequestId: params.approvalRequestId,
      userId: session.user.id,
      reason: params.reason,
    });

    revalidatePath(`/dashboard/approvals`);

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error rejecting approval request:', error);
    return { success: false, error: error.message || 'Failed to reject approval request' };
  }
}

export async function cancelApprovalRequestAction(params: {
  approvalRequestId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const result = await cancelApprovalRequest({
      approvalRequestId: params.approvalRequestId,
      userId: session.user.id,
    });

    revalidatePath(`/dashboard/approvals`);

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error canceling approval request:', error);
    return { success: false, error: error.message || 'Failed to cancel approval request' };
  }
}

export async function getApprovalRequestDetailsAction(approvalId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized.' };
    }

    const details = await getApprovalRequestDetails(approvalId);
    if (!details) {
      return { success: false, error: 'Approval request not found.' };
    }

    // Verify membership
    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, details.organizationId),
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.status, 'ACTIVE')
      ),
    });

    if (!membership) {
      return { success: false, error: 'Access denied.' };
    }

    return { success: true, data: details };
  } catch (error: any) {
    console.error('Error fetching approval details:', error);
    return { success: false, error: error.message || 'Failed to fetch details' };
  }
}

export async function getOrgApprovalsAction(params: {
  organizationId: string;
  assetId?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { organizationId, assetId, status } = params;

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

    const conditions = [eq(approvalRequests.organizationId, organizationId)];
    if (assetId) {
      conditions.push(eq(approvalRequests.assetId, assetId));
    }
    if (status) {
      conditions.push(eq(approvalRequests.status, status as any));
    }

    const requests = await db.query.approvalRequests.findMany({
      where: and(...conditions),
      orderBy: [desc(approvalRequests.createdAt)],
      with: {
        asset: true,
        requestedBy: true,
        signatures: {
          with: {
            approver: true,
          },
        },
      },
    });

    return { success: true, data: requests };
  } catch (error: any) {
    console.error('Error fetching org approvals:', error);
    return { success: false, error: error.message || 'Failed to fetch requests' };
  }
}

export async function getApprovalPoliciesAction(organizationId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized.' };
    }

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

    const policies = await db.query.approvalPolicies.findMany({
      where: eq(approvalPolicies.organizationId, organizationId),
      orderBy: [desc(approvalPolicies.createdAt)],
    });

    return { success: true, data: policies };
  } catch (error: any) {
    console.error('Error fetching policies:', error);
    return { success: false, error: error.message || 'Failed to fetch policies' };
  }
}

export async function saveApprovalPolicyAction(params: {
  organizationId: string;
  name: string;
  action: ApprovalAction;
  requiredApprovals: number;
  eligibleRoles: string[];
  eligibleUserIds?: string[];
  approvalExpiryHours?: number;
  allowSelfApproval?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized.' };
    }

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, params.organizationId),
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.status, 'ACTIVE')
      ),
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return { success: false, error: 'Admin permission required to manage approval policies.' };
    }

    // Insert policy
    const [policy] = await db
      .insert(approvalPolicies)
      .values({
        organizationId: params.organizationId,
        name: params.name,
        action: params.action,
        requiredApprovals: params.requiredApprovals,
        eligibleRoles: JSON.stringify(params.eligibleRoles),
        eligibleUserIds: params.eligibleUserIds ? JSON.stringify(params.eligibleUserIds) : null,
        approvalExpiryHours: params.approvalExpiryHours || 48,
        allowSelfApproval: params.allowSelfApproval ?? false,
        isActive: true,
      })
      .returning();

    revalidatePath(`/dashboard/approvals`);

    return { success: true, data: policy };
  } catch (error: any) {
    console.error('Error saving approval policy:', error);
    return { success: false, error: error.message || 'Failed to save policy' };
  }
}
