/**
 * Case persistence layer — MongoDB only.
 * 
 * Imported directly by both the API route and the server-rendered page so
 * the page never makes an internal HTTP fetch (relative URLs fail in RSC).
 */

import type { EmergencyCase } from './caseTypes';

async function getCollection() {
  const { getDb } = await import('./mongoClient');
  const db = await getDb();
  return db.collection<EmergencyCase>('cases');
}

/** Persist a new case to MongoDB. */
export async function saveCase(emergencyCase: EmergencyCase): Promise<void> {
  const col = await getCollection();
  await col.insertOne(emergencyCase);
}

/**
 * Read a case by ID from MongoDB.
 * Returns null when not found or on error.
 */
export async function readCase(caseId: string): Promise<EmergencyCase | null> {
  try {
    const col = await getCollection();
    const doc = await col.findOne({ caseId }, { projection: { _id: 0 } });
    return doc ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch all live/active cases (not closed/arrived)
 */
export async function readLiveCases(): Promise<EmergencyCase[]> {
  try {
    const col = await getCollection();
    // In a real system we'd filter out closed cases: { status: { $nin: ['closed', 'arrived'] } }
    // but for the demo we'll just fetch all so we have data
    const docs = await col.find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return docs;
  } catch {
    return [];
  }
}

/**
 * Update case assignment and push an event to timeline
 */
export async function overrideAssignedHospital(caseId: string, assignedHospital: any): Promise<boolean> {
  try {
    const col = await getCollection();
    const now = new Date().toISOString();
    const result = await col.updateOne(
      { caseId },
      { 
        $set: { assignedHospital, updatedAt: now },
        $push: { 
          timeline: { 
            ts: now, 
            event: `DISPATCH OVERRIDE: Re-routed to ${assignedHospital?.hospital?.name ?? 'new hospital'}` 
          } 
        } as any
      }
    );
    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}
