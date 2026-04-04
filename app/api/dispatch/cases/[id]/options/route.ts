import { NextRequest, NextResponse } from 'next/server';
import { readCase } from '@/lib/clearpath/caseStore';
import { scoreAndRankHospitals } from '@/lib/clearpath/routingService';
import { congestionService } from '@/lib/clearpath/congestionService';
import { mockHospitals } from '@/lib/clearpath/mockData';
import type { RoutingConstraints } from '@/lib/clearpath/types';

async function getHospitalsForCity(city: string) {
  try {
    const { getDb } = await import('@/lib/clearpath/mongoClient');
    const db = await getDb();
    const docs = await db.collection('hospitals').find({ city: city.toLowerCase() }).toArray();
    if (docs.length) return docs;
  } catch {
    // Fallback handled below.
  }

  const fallback = mockHospitals.filter((h) => h.city === city.toLowerCase());
  return fallback.length ? fallback : mockHospitals;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const constraints = (body?.constraints ?? {}) as RoutingConstraints;

    const existingCase = await readCase(id);
    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const hospitals = await getHospitalsForCity(existingCase.city || 'pune');
    const snapshots = await congestionService.getCongestion(existingCase.city || 'pune');

    const routeResult = await scoreAndRankHospitals(
      existingCase.userLocation.lat,
      existingCase.userLocation.lng,
      existingCase.triage.severity,
      hospitals,
      snapshots,
      null,
      existingCase.triage.predictedNeeds,
      undefined,
      constraints,
    );

    if (!routeResult) {
      return NextResponse.json({ error: 'No route options found' }, { status: 404 });
    }

    return NextResponse.json({
      caseId: id,
      constraints,
      recommended: routeResult.recommended,
      alternatives: routeResult.alternatives,
    });
  } catch (err: any) {
    console.error('[POST /api/dispatch/cases/[id]/options]', err);
    return NextResponse.json({ error: err.message || 'Failed to compute options' }, { status: 500 });
  }
}
