import { NextRequest, NextResponse } from 'next/server';
import { overrideAssignedHospital, readCase } from '@/lib/clearpath/caseStore';

export async function POST(req: NextRequest, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await req.json();
    const { newHospital, operatorId, reason } = body;

    if (!newHospital) {
      return NextResponse.json({ error: 'newHospital is required' }, { status: 400 });
    }

    // Verify case exists
    const existingCase = await readCase(id);
    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const success = await overrideAssignedHospital(id, newHospital, operatorId, reason);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
    }

    return NextResponse.json({ success: true, caseId: id });
  } catch (err: any) {
    console.error(`[POST /api/dispatch/cases/${params?.id}/override]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
