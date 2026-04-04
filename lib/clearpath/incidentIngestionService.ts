import { nanoid } from 'nanoid';
import { getDb } from './mongoClient';

export type IncidentType = 'road_closure' | 'obstacle' | 'icu_outage' | 'police_block';

export interface ExternalIncident {
  incidentId: string;
  type: IncidentType;
  city: string;
  caseId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
  source: 'simulation' | 'external_feed' | 'operator';
  createdAt: string;
  expiresAt: string;
}

async function getCollection() {
  const db = await getDb();
  return db.collection<ExternalIncident>('externalIncidents');
}

export async function createExternalIncident(input: {
  type: IncidentType;
  city: string;
  caseId?: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  source?: 'simulation' | 'external_feed' | 'operator';
  ttlMinutes?: number;
}): Promise<ExternalIncident> {
  const now = new Date();
  const ttlMinutes = Math.max(1, Number(input.ttlMinutes ?? 20));
  const incident: ExternalIncident = {
    incidentId: `INC-${nanoid(8).toUpperCase()}`,
    type: input.type,
    city: input.city.toLowerCase(),
    caseId: input.caseId,
    description: input.description,
    severity: input.severity ?? 'high',
    active: true,
    source: input.source ?? 'simulation',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString(),
  };

  const col = await getCollection();
  await col.insertOne(incident);
  return incident;
}

export async function listActiveExternalIncidents(filter?: {
  city?: string;
  caseId?: string;
  limit?: number;
}): Promise<ExternalIncident[]> {
  const col = await getCollection();
  const nowIso = new Date().toISOString();

  const query: Record<string, unknown> = {
    active: true,
    expiresAt: { $gt: nowIso },
  };

  if (filter?.city) query.city = filter.city.toLowerCase();
  if (filter?.caseId) query.$or = [{ caseId: filter.caseId }, { caseId: { $exists: false } }];

  const docs = await col
    .find(query, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(filter?.limit ?? 50)
    .toArray();

  return docs;
}

export async function hasActiveRouteBlockIncident(input: {
  city: string;
  caseId: string;
}): Promise<{ hasBlock: boolean; incident?: ExternalIncident }> {
  const incidents = await listActiveExternalIncidents({
    city: input.city,
    caseId: input.caseId,
    limit: 10,
  });

  const blocking = incidents.find((inc) => inc.type === 'road_closure' || inc.type === 'obstacle' || inc.type === 'police_block');
  return {
    hasBlock: Boolean(blocking),
    incident: blocking,
  };
}

export async function deactivateIncident(incidentId: string): Promise<boolean> {
  const col = await getCollection();
  const res = await col.updateOne({ incidentId }, { $set: { active: false } });
  return res.modifiedCount > 0;
}
