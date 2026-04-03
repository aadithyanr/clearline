// POST /api/cases  — create a new emergency case (triage + route in one shot)
// GET  /api/cases?id=CL-XXXX — fetch a case by ID

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { scoreAndRankHospitals } from '@/lib/clearpath/routingService';
import { saveCase, readCase } from '@/lib/clearpath/caseStore';
import type { EmergencyCase, TriageResult } from '@/lib/clearpath/caseTypes';

export const maxDuration = 30;

async function getHospitalsForCity(city: string) {
  const { getDb } = await import('@/lib/clearpath/mongoClient');
  const db = await getDb();
  return db.collection('hospitals').find({ city: city.toLowerCase() }).toArray();
}

// ── POST /api/cases ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      message: string;
      userLat: number;
      userLng: number;
      city?: string;
    };

    const { message, userLat, userLng, city = 'pune' } = body;

    if (!message || !userLat || !userLng) {
      return NextResponse.json({ error: 'message, userLat, userLng are required' }, { status: 400 });
    }

    // ── Step 1: Triage ───────────────────────────────────────────────────────
    const triageRes = await fetch(`${req.nextUrl.origin}/api/clearpath/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, city }),
    });
    const triage: TriageResult = await triageRes.json();

    // ── Step 2: Route using live MongoDB hospital data ────────────────────────
    const hospitals = await getHospitalsForCity(city);
    const snapshots = hospitals.map((h: any) => ({
      hospitalId: h._id.toString(),
      occupancyPct: 50 + Math.floor(Math.random() * 40),
      waitMinutes: 10 + Math.floor(Math.random() * 70),
      recordedAt: new Date().toISOString(),
    }));

    const routeResult = await scoreAndRankHospitals(
      userLat, userLng,
      triage.severity,
      hospitals,
      snapshots,
      null,
      triage.predictedNeeds,
    );

    if (!routeResult) {
      return NextResponse.json({ error: 'No hospitals found' }, { status: 404 });
    }

    // ── Step 3: Create & persist case ────────────────────────────────────────
    const caseId = `CL-${nanoid(6).toUpperCase()}`;
    const now = new Date().toISOString();

    const emergencyCase: EmergencyCase = {
      caseId,
      city,
      patientMessage: message,
      triage,
      userLocation: { lat: userLat, lng: userLng },
      assignedHospital: routeResult.recommended,
      alternatives: routeResult.alternatives,
      status: 'en_route',
      timeline: [
        { ts: now, event: 'Case created — patient triaged via message' },
        { ts: now, event: `Routed to ${routeResult.recommended.hospital.name}` },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await saveCase(emergencyCase);

    const baseUrl = process.env.BASE_URL || req.nextUrl.origin;

    return NextResponse.json({
      caseId,
      caseUrl: `${baseUrl}/case/${caseId}`,
      severity: triage.severity,
      hospital: routeResult.recommended.hospital.name,
      drivingTimeMinutes: routeResult.recommended.drivingTimeMinutes,
      suggestedAction: triage.suggestedAction,
    });
  } catch (err: any) {
    console.error('[POST /api/cases]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET /api/cases?id=CL-XXXX ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const doc = await readCase(id);
  if (!doc) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  return NextResponse.json(doc);
}
