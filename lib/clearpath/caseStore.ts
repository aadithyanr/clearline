/**
 * Case persistence layer — MongoDB only.
 * 
 * Imported directly by both the API route and the server-rendered page so
 * the page never makes an internal HTTP fetch (relative URLs fail in RSC).
 */

import type { CaseStatus, CaseTimeline, EmergencyCase } from './caseTypes';
import { buildAuditEvent } from './auditEventTypes';
import { assertTransitionCaseStatus } from './caseStateMachine';

function toPlainValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function toPlainCase<T>(value: T): T {
  return toPlainValue(value) as T;
}

function getHospitalIdentity(scoredHospital: any): { id?: string; name?: string } {
  const hospital = scoredHospital?.hospital;
  return {
    id: hospital?.id,
    name: hospital?.name,
  };
}

function buildTransitionAudit(now: string, fromStatus: CaseStatus, toStatus: CaseStatus, actorId?: string, reason?: string): CaseTimeline {
  return buildAuditEvent(now, {
    event: `Status transition: ${fromStatus} -> ${toStatus}`,
    eventType: 'status_transition',
    actorId,
    reason,
    fromStatus,
    toStatus,
  });
}

async function getCollection() {
  const { getDb } = await import('./mongoClient');
  const db = await getDb();
  return db.collection<EmergencyCase>('cases');
}

/** Persist a new case to MongoDB. */
export async function saveCase(emergencyCase: EmergencyCase): Promise<void> {
  const col = await getCollection();
  await col.insertOne(toPlainCase(emergencyCase));
}

/**
 * Read a case by ID from MongoDB.
 * Returns null when not found or on error.
 */
export async function readCase(caseId: string): Promise<EmergencyCase | null> {
  try {
    const col = await getCollection();
    const doc = await col.findOne({ caseId }, { projection: { _id: 0 } });
    return doc ? toPlainCase(doc) : null;
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
    // Keep only active cases on the dispatch board.
    const docs = await col.find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return docs
      .filter((doc) => doc.status !== 'closed' && doc.status !== 'arrived')
      .map((doc) => toPlainCase(doc));
  } catch {
    return [];
  }
}

/**
 * Update case assignment and push an event to timeline
 */
export async function overrideAssignedHospital(
  caseId: string,
  assignedHospital: any,
  actorId?: string,
  reason?: string,
): Promise<boolean> {
  try {
    const col = await getCollection();
    const current = await col.findOne({ caseId }, { projection: { _id: 0 } });
    if (!current) return false;

    const nextStatus: CaseStatus = 'awaiting_hospital_ack';
    assertTransitionCaseStatus(current.status, nextStatus);

    const now = new Date().toISOString();
    const prevHospital = getHospitalIdentity(current.assignedHospital);
    const nextHospital = getHospitalIdentity(assignedHospital);
    const events: CaseTimeline[] = [
      buildAuditEvent(now, {
        event: `DISPATCH OVERRIDE: Re-routed to ${nextHospital.name ?? 'new hospital'}`,
        eventType: 'dispatch_override',
        actorId,
        reason,
        previousHospitalId: prevHospital.id,
        previousHospitalName: prevHospital.name,
        nextHospitalId: nextHospital.id,
        nextHospitalName: nextHospital.name,
      }),
      buildTransitionAudit(now, current.status, nextStatus, actorId, reason),
    ];

    const result = await col.updateOne(
      { caseId },
      {
        $set: {
          assignedHospital,
          status: nextStatus,
          updatedAt: now,
          hospitalAck: {
            status: 'pending',
            hospitalId: nextHospital.id,
            actorId,
            reason,
            updatedAt: now,
          },
        },
        $push: {
          timeline: {
            $each: events,
          },
        } as any,
      },
    );
    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}

export async function acknowledgeHospitalAssignment(
  caseId: string,
  hospitalId: string,
  actorId?: string,
  reason?: string,
): Promise<boolean> {
  try {
    const col = await getCollection();
    const current = await col.findOne({ caseId }, { projection: { _id: 0 } });
    if (!current) return false;

    const assigned = getHospitalIdentity(current.assignedHospital);
    if (assigned.id && hospitalId && assigned.id !== hospitalId) {
      return false;
    }

    const fromStatus = current.status as CaseStatus;
    const toStatus: CaseStatus = fromStatus === 'awaiting_hospital_ack' ? 'en_route' : fromStatus;
    assertTransitionCaseStatus(fromStatus, toStatus);

    const now = new Date().toISOString();
    const events: CaseTimeline[] = [
      buildAuditEvent(now, {
        event: `Hospital acknowledged intake${assigned.name ? `: ${assigned.name}` : ''}`,
        eventType: 'hospital_acknowledged',
        actorId,
        reason,
        nextHospitalId: assigned.id,
        nextHospitalName: assigned.name,
      }),
    ];

    if (fromStatus !== toStatus) {
      events.push(buildTransitionAudit(now, fromStatus, toStatus, actorId, reason));
    }

    const result = await col.updateOne(
      { caseId },
      {
        $set: {
          status: toStatus,
          updatedAt: now,
          hospitalAck: {
            status: 'acknowledged',
            hospitalId: assigned.id,
            actorId,
            reason,
            updatedAt: now,
          },
        },
        $push: { timeline: { $each: events } } as any,
      },
    );

    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}

export async function rejectHospitalAndAssignFallback(
  caseId: string,
  rejectedHospitalId: string,
  actorId?: string,
  reason?: string,
): Promise<{ success: boolean; fallbackHospitalName?: string; message?: string }> {
  try {
    const col = await getCollection();
    const current = await col.findOne({ caseId }, { projection: { _id: 0 } });
    if (!current) return { success: false, message: 'Case not found' };

    const previousHospital = getHospitalIdentity(current.assignedHospital);
    if (previousHospital.id && rejectedHospitalId && previousHospital.id !== rejectedHospitalId) {
      return { success: false, message: 'Rejected hospital does not match current assignment' };
    }

    const alternatives = Array.isArray(current.alternatives) ? current.alternatives : [];
    const fallbackHospital = alternatives.find((alt: any) => getHospitalIdentity(alt).id !== rejectedHospitalId);
    if (!fallbackHospital) {
      return { success: false, message: 'No fallback hospital available' };
    }

    const fromStatus = current.status as CaseStatus;
    const toStatus: CaseStatus = 'awaiting_hospital_ack';
    assertTransitionCaseStatus(fromStatus, toStatus);

    const now = new Date().toISOString();
    const fallbackIdentity = getHospitalIdentity(fallbackHospital);
    const remainingAlternatives = alternatives.filter((alt: any) => getHospitalIdentity(alt).id !== fallbackIdentity.id);

    const events: CaseTimeline[] = [
      buildAuditEvent(now, {
        event: `Hospital rejected intake${previousHospital.name ? `: ${previousHospital.name}` : ''}`,
        eventType: 'hospital_rejected',
        actorId,
        reason,
        previousHospitalId: previousHospital.id,
        previousHospitalName: previousHospital.name,
      }),
      buildAuditEvent(now, {
        event: `Fallback assigned: ${fallbackIdentity.name ?? 'alternate hospital'}`,
        eventType: 'fallback_assigned',
        actorId,
        reason,
        previousHospitalId: previousHospital.id,
        previousHospitalName: previousHospital.name,
        nextHospitalId: fallbackIdentity.id,
        nextHospitalName: fallbackIdentity.name,
      }),
    ];

    if (fromStatus !== toStatus) {
      events.push(buildTransitionAudit(now, fromStatus, toStatus, actorId, reason));
    }

    const result = await col.updateOne(
      { caseId },
      {
        $set: {
          assignedHospital: fallbackHospital,
          alternatives: remainingAlternatives,
          status: toStatus,
          updatedAt: now,
          hospitalAck: {
            status: 'pending',
            hospitalId: fallbackIdentity.id,
            actorId,
            reason,
            updatedAt: now,
          },
        },
        $push: {
          timeline: {
            $each: events,
          },
        } as any,
      },
    );

    return {
      success: result.modifiedCount > 0,
      fallbackHospitalName: fallbackIdentity.name,
    };
  } catch {
    return { success: false, message: 'Failed to reject and fallback' };
  }
}
