import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizationMemberships } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { evaluateAssetRisk } from '@/lib/risk/risk-engine';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assetId, organizationId, action, targetCustodianId, persist } = body;

    if (!assetId || !organizationId) {
      return NextResponse.json(
        { error: 'assetId and organizationId are required' },
        { status: 400 }
      );
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

    const result = await evaluateAssetRisk({
      assetId,
      organizationId,
      action: action || 'ASSET_ACCESS',
      requestedById: session.user.id,
      targetCustodianId,
      persist: persist !== false,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('API evaluate risk error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
