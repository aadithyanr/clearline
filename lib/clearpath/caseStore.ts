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
