import { NextRequest, NextResponse } from 'next/server';
import {
  createExternalIncident,
  deactivateIncident,
  listActiveExternalIncidents,
  type IncidentType,
} from '@/lib/clearpath/incidentIngestionService';

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city') || undefined;
    const caseId = req.nextUrl.searchParams.get('caseId') || undefined;

    const incidents = await listActiveExternalIncidents({ city, caseId, limit: 50 });
    return NextResponse.json({ incidents });
  } catch (err: unknown) {
    console.error('[GET /api/incidents]', err);
    const message = err instanceof Error ? err.message : 'Failed to list incidents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (typeof body?.incidentId === 'string' && body?.action === 'deactivate') {
      const ok = await deactivateIncident(body.incidentId);
      return NextResponse.json({ success: ok, incidentId: body.incidentId });
    }

    const type = body?.type as IncidentType | undefined;
    const city = typeof body?.city === 'string' ? body.city : '';
    const caseId = typeof body?.caseId === 'string' ? body.caseId : undefined;
    const description =
      typeof body?.description === 'string'
        ? body.description
        : 'External incident ingested from simulation feed';

    if (!type || !city) {
      return NextResponse.json({ error: 'type and city are required' }, { status: 400 });
    }

    const incident = await createExternalIncident({
      type,
      city,
      caseId,
      description,
      severity: body?.severity,
      source: body?.source,
      ttlMinutes: body?.ttlMinutes,
    });

    return NextResponse.json({ incident });
  } catch (err: unknown) {
    console.error('[POST /api/incidents]', err);
    const message = err instanceof Error ? err.message : 'Failed to create incident';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
