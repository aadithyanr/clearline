export interface Hospital {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  totalBeds: number;
  erBeds: number;
  isLevel1TraumaCenter?: boolean;
  phone?: string;
  website?: string;
  specialties?: string[];
}

export interface CongestionSnapshot {
  hospitalId: string;
  occupancyPct: number;
  waitMinutes: number;
  recordedAt: Date;
}

export interface ProposedBuildingInput {
  lat: number;
  lng: number;
  capacity: number;
  /** ER beds from building metadata; when provided, used directly in simulation */
  erBeds?: number;
}

export interface SimulateRequest {
  city: string;
  proposals: ProposedBuildingInput[];
}

export interface SimulateResult {
  before: Record<string, number>;
  after: Record<string, number>;
  delta: Record<string, number>;
  /** Occupancy for each proposed hospital (key: proposed-0, proposed-1, ...) */
  proposedAfter?: Record<string, number>;
}

export interface VitalsPayload {
  heartRate: number;
  respiratoryRate: number;
  stressIndex: number;
  emotionState?: string;
}

export interface SymptomsPayload {
  chestPain: boolean;
  shortnessOfBreath: boolean;
  fever: boolean;
  feverDays?: number;
  dizziness: boolean;
  freeText?: string;
}

export interface TriageRequest {
  vitals: VitalsPayload;
  symptoms: SymptomsPayload;
  city: string;
}

export interface TriageResponse {
  severity: 'critical' | 'urgent' | 'non-urgent';
  reasoning: string;
}

export interface RouteRequest {
  userLat?: number;
  userLng?: number;
  postalCode?: string;
  severity: 'critical' | 'urgent' | 'non-urgent';
  city: string;
  symptoms?: SymptomsPayload;
  predictedNeeds?: string[];
  imageSeverity?: 'high' | 'low';
  constraints?: RoutingConstraints;
}

export interface RoutingConstraints {
  requireVentilator?: boolean;
  requireIcu?: boolean;
  requireCardiacSpecialist?: boolean;
  requireNeurosurgeon?: boolean;
  maxOccupancyPct?: number;
  massCasualtyMode?: boolean;
}

export interface ScoreBreakdown {
  driveComponent: number;
  waitComponent: number;
  occupancyComponent: number;
  specialtyComponent: number;
  equipmentComponent: number;
  massCasualtyComponent: number;
  total: number;
}

export interface ScoredHospital {
  hospital: Hospital;
  score: number;
  drivingTimeMinutes: number;
  waitMinutes: number;
  adjustedWaitMinutes: number;
  distanceKm: number;
  occupancyPct: number;
  specialtyMatch: boolean;
  routeGeometry: any;
  congestionSegments?: string[];
  totalEstimatedMinutes: number;
  reason: string;
  sceneSeverityOverride?: boolean;
  scoreBreakdown?: ScoreBreakdown;
}

export interface RouteResponse {
  recommended: ScoredHospital;
  alternatives: ScoredHospital[];
  userLocation: { lat: number; lng: number };
}
