// Case types for the Clearline emergency case system

export interface TriageResult {
  severity: 'critical' | 'urgent' | 'non-urgent';
  confidenceScore?: number;
  escalationRecommended?: boolean;
  predictedNeeds: string[];
  reasoning: string;
  suggestedAction: string;
}

export interface CaseTimeline {
  ts: string;
  event: string;
  eventType?:
    | 'case_created'
    | 'status_transition'
    | 'dispatch_override'
    | 'hospital_acknowledged'
    | 'hospital_rejected'
    | 'fallback_assigned';
  actorId?: string;
  reason?: string;
  previousHospitalId?: string;
  previousHospitalName?: string;
  nextHospitalId?: string;
  nextHospitalName?: string;
  fromStatus?: CaseStatus;
  toStatus?: CaseStatus;
}

export type CaseStatus =
  | 'triaging'
  | 'routing'
  | 'awaiting_hospital_ack'
  | 'en_route'
  | 'arrived'
  | 'closed';

export interface HospitalAckState {
  status: 'pending' | 'acknowledged' | 'rejected';
  hospitalId?: string;
  actorId?: string;
  reason?: string;
  updatedAt: string;
}

export interface EmergencyCase {
  caseId: string;
  incidentId?: string;
  city: string;
  patientMessage: string;          // original message (stored but shown safely)
  triage: TriageResult;
  userLocation: { lat: number; lng: number };
  assignedHospital: unknown;       // ScoredHospital from routing engine
  alternatives: unknown[];
  status: CaseStatus;
  hospitalAck?: HospitalAckState;
  timeline: CaseTimeline[];
  createdAt: string;
  updatedAt: string;
}
