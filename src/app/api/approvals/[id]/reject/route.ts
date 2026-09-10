import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rejectApprovalRequest } from '@/lib/approval/approval-manager';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'reason is required to reject an approval' }, { status: 400 });
    }

    const result = await rejectApprovalRequest({
      approvalRequestId: id,
      userId: session.user.id,
      reason,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('API POST reject approval error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
