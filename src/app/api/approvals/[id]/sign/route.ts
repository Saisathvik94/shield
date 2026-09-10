import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { signApprovalRequest } from '@/lib/approval/approval-manager';

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
    const { signatureHex, signerWallet, actionDigest } = body;

    if (!signatureHex || !signerWallet || !actionDigest) {
      return NextResponse.json(
        { error: 'signatureHex, signerWallet, and actionDigest are required' },
        { status: 400 }
      );
    }

    const result = await signApprovalRequest({
      approvalRequestId: id,
      walletAddress: signerWallet,
      signatureHex,
      actionDigest,
      userId: session.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('API POST sign approval error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
