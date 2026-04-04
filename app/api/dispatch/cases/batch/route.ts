import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { scoreAndRankHospitals } from '@/lib/clearpath/routingService';
import { saveCase } from '@/lib/clearpath/caseStore';
import { congestionService } from '@/lib/clearpath/congestionService';
import type { EmergencyCase, TriageResult } from '@/lib/clearpath/caseTypes';

export const maxDuration = 60; // batch operations need extra time

async function getHospitalsForCity(city: string) {
  const { getDb } = await import('@/lib/clearpath/mongoClient');
  const db = await getDb();
  return db.collection('hospitals').find({ city: city.toLowerCase() }).toArray();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incidentPayloads = body.cases as Array<{
      message: string;
      userLat: number;
      userLng: number;
      city?: string;
    }>;

    if (!incidentPayloads || !Array.isArray(incidentPayloads) || incidentPayloads.length === 0) {
      return NextResponse.json({ error: 'Array of cases is required' }, { status: 400 });
    }

    const city = incidentPayloads[0].city || 'pune';
    const massCasualtyMode = body.massCasualtyMode !== false;
    const incidentId = `MCI-${nanoid(6).toUpperCase()}`;
    const hospitals = await getHospitalsForCity(city);
    
    // Fetch live networking baseline once
    let runningSnapshots = await congestionService.getCongestion(city);

    const results: EmergencyCase[] = [];

    for (const payload of incidentPayloads) {
      // 1. Triage the payload independently
      const triageRes = await fetch(`${req.nextUrl.origin}/api/clearpath/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payload.message, city }),
      });
      const triage: TriageResult = await triageRes.json();

      // 2. Score hospitals against the *running* network snapshots
      const routeResult = await scoreAndRankHospitals(
        payload.userLat, 
        payload.userLng,
        triage.severity,
        hospitals,
        runningSnapshots,
        null, // explicitly pass null for symptoms to use array format
        triage.predictedNeeds,
        undefined,
        { massCasualtyMode },
      );

      if (!routeResult) {
        continue;
      }

      // 3. Mathematical Optimization step: Apply load penalties to the assigned hospital
      // so the next cases actively route away from it due to high occupancy score
      const assignedId = routeResult.recommended.hospital.id || (routeResult.recommended.hospital as any)._id?.toString();
      
      runningSnapshots = runningSnapshots.map((snap: any) => {
        if (snap.hospitalId === assignedId) {
          return {
            ...snap,
            occupancyPct: Math.min(100, snap.occupancyPct + 15), // MASSIVE spike per patient (simulates heavy ER hit)
            waitMinutes: snap.waitMinutes + 25 // 25 min added wait time
          };
        }
        return snap;
      });

      // 4. Save case to Mongo
      const now = new Date().toISOString();
      const caseDoc: EmergencyCase = {
        caseId: `CL-${nanoid(6).toUpperCase()}`,
        incidentId,
        city,
        patientMessage: payload.message,
        triage,
        userLocation: { lat: payload.userLat, lng: payload.userLng },
        assignedHospital: routeResult.recommended,
        alternatives: routeResult.alternatives,
        status: 'en_route',
        createdAt: now,
        updatedAt: now,
        timeline: [
          { ts: now, event: 'Case created via Mass Casualty sequence' },
          { ts: now, event: `Routed to ${routeResult.recommended.hospital.name}` },
        ]
      };

      await saveCase(caseDoc);
      results.push(caseDoc);
    }

    return NextResponse.json({ incidentId, cases: results, success: true });

  } catch (err: any) {
    console.error('Batch Optimizer Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
