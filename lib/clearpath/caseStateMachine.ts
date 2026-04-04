import type { CaseStatus } from './caseTypes';

const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  triaging: ['routing'],
  routing: ['awaiting_hospital_ack', 'en_route', 'closed'],
  awaiting_hospital_ack: ['en_route', 'routing', 'closed'],
  en_route: ['awaiting_hospital_ack', 'arrived', 'closed'],
  arrived: ['closed'],
  closed: [],
};

export function canTransitionCaseStatus(fromStatus: CaseStatus, toStatus: CaseStatus): boolean {
  if (fromStatus === toStatus) return true;
  return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

export function assertTransitionCaseStatus(fromStatus: CaseStatus, toStatus: CaseStatus): void {
  if (!canTransitionCaseStatus(fromStatus, toStatus)) {
    throw new Error(`Invalid case status transition: ${fromStatus} -> ${toStatus}`);
  }
}
