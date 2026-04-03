import { NextResponse } from 'next/server';
import { readLiveCases } from '@/lib/clearpath/caseStore';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const cases = await readLiveCases();
    return NextResponse.json({ cases });
  } catch (err: any) {
    console.error('[GET /api/dispatch/cases]', err);
    return NextResponse.json({ error: 'Failed to fetch active cases', cases: [] }, { status: 500 });
  }
}
