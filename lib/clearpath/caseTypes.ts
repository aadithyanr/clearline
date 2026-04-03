// Case types for the Clearline emergency case system

export interface TriageResult {
  severity: 'critical' | 'urgent' | 'non-urgent';
  predictedNeeds: string[];
  reasoning: string;
  suggestedAction: string;
}

export interface CaseTimeline {
  ts: string;
  event: string;
}

export type CaseStatus = 'triaging' | 'routing' | 'en_route' | 'arrived' | 'closed';

export interface EmergencyCase {
  caseId: string;
  city: string;
  patientMessage: string;          // original message (stored but shown safely)
  triage: TriageResult;
  userLocation: { lat: number; lng: number };
  assignedHospital: any;           // ScoredHospital from routing engine
  alternatives: any[];
  status: CaseStatus;
  timeline: CaseTimeline[];
  createdAt: string;
  updatedAt: string;
}
