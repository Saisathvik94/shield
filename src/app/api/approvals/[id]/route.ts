import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizationMemberships } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getApprovalRequestDetails } from '@/lib/approval/approval-manager';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const details = await getApprovalRequestDetails(id);

    if (!details) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, details.organizationId),
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.status, 'ACTIVE')
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ data: details });
  } catch (error: any) {
    console.error('API GET approval details error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
