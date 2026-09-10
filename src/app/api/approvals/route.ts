import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizationMemberships, approvalRequests } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createApprovalRequest } from '@/lib/approval/approval-manager';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const assetId = searchParams.get('assetId');
    const status = searchParams.get('status');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.status, 'ACTIVE')
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const conditions = [eq(approvalRequests.organizationId, organizationId)];
    if (assetId) conditions.push(eq(approvalRequests.assetId, assetId));
    if (status) conditions.push(eq(approvalRequests.status, status as any));

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

    return NextResponse.json({ data: requests });
  } catch (error: any) {
    console.error('API GET approvals error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId, assetId, action, targetSubjectId, requestedCustodianId, customParams } = body;

    if (!organizationId || !action) {
      return NextResponse.json({ error: 'organizationId and action are required' }, { status: 400 });
    }

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.status, 'ACTIVE')
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    console.error('API POST approvals error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
