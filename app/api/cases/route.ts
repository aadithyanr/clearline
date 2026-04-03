// POST /api/cases  — create a new emergency case (triage + route in one shot)
// GET  /api/cases/[id] — fetch a case by ID (used by the public case page)

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { mockHospitals } from '@/lib/clearpath/mockData';
import { scoreAndRankHospitals } from '@/lib/clearpath/routingService';
import type { EmergencyCase, TriageResult } from '@/lib/clearpath/caseTypes';

export const maxDuration = 30;

// In-memory store as fallback when MongoDB is down (works fine for demo)
const globalStore = globalThis as unknown as { __casesStore: Map<string, EmergencyCase> };
if (!globalStore.__casesStore) {
  globalStore.__casesStore = new Map<string, EmergencyCase>();
}
const memStore = globalStore.__casesStore;

async function getCollection() {
  const { getDb } = await import('@/lib/clearpath/mongoClient');
  const db = await getDb();
  return db.collection<EmergencyCase>('cases');
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

    // ── Step 2: Route ────────────────────────────────────────────────────────
    const hospitals = mockHospitals.filter(h => h.city === city.toLowerCase());
    const snapshots = hospitals.map(h => ({
      hospitalId: h.id,
      occupancyPct: 50 + Math.floor(Math.random() * 40),
      waitMinutes: 10 + Math.floor(Math.random() * 70),
      recordedAt: new Date().toISOString(),
    }));

    const routeResult = await scoreAndRankHospitals(
      userLat, userLng,
      triage.severity,
      hospitals,
      snapshots,
      null
    );

    if (!routeResult) {
      return NextResponse.json({ error: 'No hospitals found' }, { status: 404 });
    }

    // ── Step 3: Create Case ──────────────────────────────────────────────────
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

    // Persist — try MongoDB, fall back to memory
    try {
      const col = await getCollection();
      await col.insertOne(emergencyCase);
    } catch {
      memStore.set(caseId, emergencyCase);
    }

    return NextResponse.json({
      caseId,
      caseUrl: `${req.nextUrl.origin}/case/${caseId}`,
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

  // Check memory store first
  if (memStore.has(id)) {
    return NextResponse.json(memStore.get(id));
  }

  try {
    const col = await getCollection();
    const doc = await col.findOne({ caseId: id });
    if (!doc) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }
}
