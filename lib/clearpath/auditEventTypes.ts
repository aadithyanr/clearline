import type { CaseStatus, CaseTimeline } from './caseTypes';

export type AuditEventType =
  | 'case_created'
  | 'status_transition'
  | 'dispatch_override'
  | 'hospital_acknowledged'
  | 'hospital_rejected'
  | 'fallback_assigned';

export interface AuditEventInput {
  event: string;
  eventType: AuditEventType;
  actorId?: string;
  reason?: string;
  previousHospitalId?: string;
  previousHospitalName?: string;
  nextHospitalId?: string;
  nextHospitalName?: string;
  fromStatus?: CaseStatus;
  toStatus?: CaseStatus;
}

export function buildAuditEvent(nowIso: string, input: AuditEventInput): CaseTimeline {
  return {
    ts: nowIso,
    event: input.event,
    eventType: input.eventType,
    actorId: input.actorId,
    reason: input.reason,
    previousHospitalId: input.previousHospitalId,
    previousHospitalName: input.previousHospitalName,
    nextHospitalId: input.nextHospitalId,
    nextHospitalName: input.nextHospitalName,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
  };
}
