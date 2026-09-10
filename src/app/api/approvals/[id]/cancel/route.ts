import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cancelApprovalRequest } from '@/lib/approval/approval-manager';

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

    const result = await cancelApprovalRequest({
      approvalRequestId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('API POST cancel approval error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
