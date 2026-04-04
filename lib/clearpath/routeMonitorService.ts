import { detectClosureOrSevereDrift } from './closureDetector';
import { getDb } from './mongoClient';

export type MonitorEventType =
  | 'closure_detected'
  | 'reroute_alert'
  | 'coordination_triggered'
  | 'triage_escalated';

export interface MonitorEvent {
  type: MonitorEventType;
  caseId: string;
  ts: number;
  reason: string;
  etaDriftMinutes?: number;
  coordination?: {
    channel: 'traffic' | 'police_and_traffic';
    severity: 'critical' | 'urgent' | 'non-urgent';
    baselineEtaMinutes?: number;
    currentEtaMinutes?: number;
  };
  triageEscalation?: {
    severity: 'critical' | 'urgent' | 'non-urgent';
    confidenceScore: number;
    escalationLevel: 'dispatch_supervisor' | 'medical_director';
  };
}

export interface MonitorPingInput {
  caseId: string;
  baselineEtaMinutes?: number;
  currentEtaMinutes?: number;
  roadClosureReported?: boolean;
}

async function getCollection() {
  const db = await getDb();
  return db.collection<MonitorEvent>('monitorEvents');
}

export async function saveMonitorEvent(event: MonitorEvent): Promise<void> {
  const col = await getCollection();
  await col.insertOne(event);
}

export async function readRecentMonitorEvents(sinceTs: number, limit = 100): Promise<MonitorEvent[]> {
  const col = await getCollection();
  const docs = await col
    .find({ ts: { $gt: sinceTs } }, { projection: { _id: 0 } })
    .sort({ ts: 1 })
    .limit(limit)
    .toArray();
  return docs;
}

export async function evaluateMonitorPing(
  input: MonitorPingInput,
): Promise<{ closureDetected: boolean; etaDriftMinutes: number; reason: string }> {
  const result = detectClosureOrSevereDrift({
    roadClosureReported: input.roadClosureReported,
    baselineEtaMinutes: input.baselineEtaMinutes,
    currentEtaMinutes: input.currentEtaMinutes,
  });

  if (result.closureDetected) {
    await saveMonitorEvent({
      type: 'closure_detected',
      caseId: input.caseId,
      ts: Date.now(),
      reason: result.reason,
      etaDriftMinutes: result.etaDriftMinutes,
    });
  }

  return result;
}

export async function emitRerouteAlert(caseId: string, reason: string, etaDriftMinutes?: number): Promise<void> {
  await saveMonitorEvent({
    type: 'reroute_alert',
    caseId,
    ts: Date.now(),
    reason,
    etaDriftMinutes,
  });
}

export async function hasRecentCoordinationTrigger(caseId: string, windowMs = 15 * 60 * 1000): Promise<boolean> {
  const col = await getCollection();
  const recentCount = await col.countDocuments({
    caseId,
    type: 'coordination_triggered',
    ts: { $gt: Date.now() - windowMs },
  });
  return recentCount > 0;
}

export async function emitCoordinationTrigger(input: {
  caseId: string;
  reason: string;
  etaDriftMinutes?: number;
  channel: 'traffic' | 'police_and_traffic';
  severity: 'critical' | 'urgent' | 'non-urgent';
  baselineEtaMinutes?: number;
  currentEtaMinutes?: number;
}): Promise<void> {
  await saveMonitorEvent({
    type: 'coordination_triggered',
    caseId: input.caseId,
    ts: Date.now(),
    reason: input.reason,
    etaDriftMinutes: input.etaDriftMinutes,
    coordination: {
      channel: input.channel,
      severity: input.severity,
      baselineEtaMinutes: input.baselineEtaMinutes,
      currentEtaMinutes: input.currentEtaMinutes,
    },
  });
}

export async function hasRecentTriageEscalation(caseId: string, windowMs = 10 * 60 * 1000): Promise<boolean> {
  const col = await getCollection();
  const recentCount = await col.countDocuments({
    caseId,
    type: 'triage_escalated',
    ts: { $gt: Date.now() - windowMs },
  });
  return recentCount > 0;
}

export async function emitTriageEscalation(input: {
  caseId: string;
  reason: string;
  severity: 'critical' | 'urgent' | 'non-urgent';
  confidenceScore: number;
  escalationLevel: 'dispatch_supervisor' | 'medical_director';
}): Promise<void> {
  await saveMonitorEvent({
    type: 'triage_escalated',
    caseId: input.caseId,
    ts: Date.now(),
    reason: input.reason,
    triageEscalation: {
      severity: input.severity,
      confidenceScore: input.confidenceScore,
      escalationLevel: input.escalationLevel,
    },
  });
}
