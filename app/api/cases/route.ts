// POST /api/cases  — create a new emergency case (triage + route in one shot)
// GET  /api/cases/[id] — fetch a case by ID (used by the public case page)

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';
import { mockHospitals } from '@/lib/clearpath/mockData';
import { scoreAndRankHospitals } from '@/lib/clearpath/routingService';
import type { EmergencyCase, TriageResult } from '@/lib/clearpath/caseTypes';

export const maxDuration = 30;

// File-based store as fallback when MongoDB is down to survive Next.js HMR reload
const FALLBACK_FILE = path.join(process.cwd(), '.next', 'fallback_cases.json');

function readFallbackDB(): Record<string, EmergencyCase> {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function writeFallbackDB(data: Record<string, EmergencyCase>) {
  try {
    fs.mkdirSync(path.dirname(FALLBACK_FILE), { recursive: true });
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

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

    // Determine base URL for case link
    const baseUrl = process.env.BASE_URL || req.nextUrl.origin;
    const caseUrl = `${baseUrl}/case/${caseId}`;

    // Write to fallback DB for local dev
    if (!process.env.VERCEL) {
      const db = readFallbackDB();
      db[caseId] = emergencyCase;
      writeFallbackDB(db);
    }

    // Insert into MongoDB with a timeout to avoid hanging the request
    const insertPromise = getCollection().then(col => col.insertOne(emergencyCase));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Mongo insert timeout')), 3000));
    try {
      await Promise.race([insertPromise, timeoutPromise]);
    } catch (e) {
      console.error('[MongoDB Insert Error]', e);
    }

    return NextResponse.json({
      caseId,
      caseUrl,
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

  // ALWAYS resolve from file-store first if it exists to prevent Mongo hangs
  const db = readFallbackDB();
  if (db[id]) {
    return NextResponse.json(db[id]);
  }

  // Only if missing from local cache, try MongoDB with a strict timeout
  try {
    const col = await getCollection();
    // Using a simple Promise.race to enforce a 3s timeout on the MongoDB read
    const doc = await Promise.race([
      col.findOne({ caseId: id }),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
    ]);
    
    if (!doc) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }
}
