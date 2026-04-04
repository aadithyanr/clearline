import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeHospitalAssignment, readCase } from '@/lib/clearpath/caseStore';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: hospitalId } = await params;
    if (!hospitalId) {
      return NextResponse.json({ error: 'hospital id required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const caseId = typeof body?.caseId === 'string' ? body.caseId : '';
    const actorId = typeof body?.actorId === 'string' ? body.actorId : undefined;
    const reason = typeof body?.reason === 'string' ? body.reason : undefined;

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    const existingCase = await readCase(caseId);
    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const success = await acknowledgeHospitalAssignment(caseId, hospitalId, actorId, reason);
    if (!success) {
      return NextResponse.json({ error: 'Failed to acknowledge hospital assignment' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      caseId,
      hospitalId,
      status: 'acknowledged',
    });
  } catch (err: any) {
    console.error('[POST /api/hospital/[id]/ack]', err);
    return NextResponse.json({ error: err?.message || 'Failed to acknowledge assignment' }, { status: 500 });
  }
}
