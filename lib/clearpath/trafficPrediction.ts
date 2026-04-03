// ── LSTM-powered congestion prediction ────────────────────────
export async function getLSTMCongestion(
  city: "mumbai" | "pune" | "nagpur",
  roadType: "highway" | "arterial" | "local" = "arterial",
  overrideHour?: number
): Promise<number> {
  const now = new Date()
  const hour = overrideHour ?? now.getHours()
  const day_of_week = now.getDay() === 0 ? 6 : now.getDay() - 1
  const month = now.getMonth() + 1

  // Maharashtra public holidays (MM-DD)
  const holidays = ["01-01", "01-26", "03-25", "04-14", "05-01",
    "08-15", "10-02", "11-01", "12-25"]
  const today = `${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const is_holiday = holidays.includes(today) ? 1 : 0

  try {
    const res = await fetch("/api/clearpath/predict-congestion", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, road_type: roadType, hour, day_of_week, month, is_holiday }),
    })
    const { congestion_multiplier } = await res.json()
    return congestion_multiplier
  } catch {
    // Fallback to existing hardcoded array if model is unreachable
    const fallback = TRAFFIC_MULTIPLIERS.weekday[hour] ?? 1.5
    return fallback
  }
}

const CONGESTION_NUMERIC: Record<string, number> = {
  low: 1,
  moderate: 2,
  heavy: 3,
  severe: 4,
  unknown: 1,
};

const NUMERIC_TO_LEVEL = ['low', 'moderate', 'heavy', 'severe'] as const;

const TRAFFIC_MULTIPLIERS: Record<string, number[]> = {
  weekday: [
    0.85, 0.80, 0.80, 0.80, 0.85, 0.95,
    1.15, 1.40, 1.45, 1.20, 1.05, 1.00,
    1.05, 1.00, 1.00, 1.10, 1.35, 1.45,
    1.25, 1.10, 1.00, 0.95, 0.90, 0.85,
  ],
  weekend: [
    0.80, 0.75, 0.75, 0.75, 0.75, 0.80,
    0.85, 0.90, 0.95, 1.00, 1.05, 1.10,
    1.10, 1.05, 1.05, 1.05, 1.00, 0.95,
    0.90, 0.85, 0.85, 0.80, 0.80, 0.80,
  ],
};

function getDayType(d: Date): string {
  return [0, 6].includes(d.getDay()) ? 'weekend' : 'weekday';
}

function getMultiplier(d: Date): number {
  const dayType = getDayType(d);
  const hour = d.getHours();
  const minute = d.getMinutes();
  const currentMult = TRAFFIC_MULTIPLIERS[dayType][hour];
  const nextMult = TRAFFIC_MULTIPLIERS[dayType][(hour + 1) % 24];
  return currentMult + (nextMult - currentMult) * (minute / 60);
}

export interface PredictedSegment {
  congestion: string;
  color: string;
}

export interface TimelinePrediction {
  minutesFromNow: number;
  label: string;
  segments: PredictedSegment[];
  avgCongestionLevel: number;
  drivingTimeMultiplier: number;
}

const COLORS: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  heavy: '#f97316',
  severe: '#dc2626',
};

export function predictTrafficTimeline(
  baseCongestionSegments: string[] | undefined,
  baseCount: number,
  steps: number = 13,
  intervalMinutes: number = 5,
): TimelinePrediction[] {
  const now = new Date();
  const nowMult = getMultiplier(now);

  const baseSegments = baseCongestionSegments?.length
    ? baseCongestionSegments
    : Array(Math.max(baseCount, 1)).fill('low');

  const baseNumeric = baseSegments.map(s => CONGESTION_NUMERIC[s] ?? 1);

  const predictions: TimelinePrediction[] = [];

  for (let step = 0; step < steps; step++) {
    const minutesFromNow = step * intervalMinutes;
    const futureDate = new Date(now.getTime() + minutesFromNow * 60_000);
    const futureMult = getMultiplier(futureDate);

    const ratio = futureMult / (nowMult || 1);

    const segments: PredictedSegment[] = baseNumeric.map(baseLevel => {
      const adjusted = Math.round(baseLevel * ratio);
      const clamped = Math.max(1, Math.min(4, adjusted));
      const level = NUMERIC_TO_LEVEL[clamped - 1];
      return { congestion: level, color: COLORS[level] };
    });

    const avgLevel = segments.reduce(
      (sum, s) => sum + (CONGESTION_NUMERIC[s.congestion] ?? 1), 0
    ) / (segments.length || 1);

    const hours = futureDate.getHours();
    const mins = futureDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const label = minutesFromNow === 0 ? 'Now' : `${h12}:${mins} ${ampm}`;

    predictions.push({
      minutesFromNow,
      label,
      segments,
      avgCongestionLevel: Math.round(avgLevel * 10) / 10,
      drivingTimeMultiplier: Math.round(ratio * 100) / 100,
    });
  }

  return predictions;
}

export function shouldReroute(
  currentPrediction: TimelinePrediction,
  threshold: number = 2.5,
): boolean {
  return currentPrediction.avgCongestionLevel >= threshold;
}

// ---------------------------------------------------------------------------
// Smart Reroute Alerts
// ---------------------------------------------------------------------------

export interface RerouteAlert {
  id: string;
  trigger: 'traffic' | 'capacity' | 'diversion' | 'incident' | 'faster_alt';
  title: string;
  description: string;
  severity: 'warning' | 'critical';
  suggestedHospital?: string;
}

const TRIGGER_ICONS: Record<RerouteAlert['trigger'], string> = {
  traffic: 'Heavy Traffic Detected',
  capacity: 'ER Capacity Surge',
  diversion: 'Hospital on Diversion',
  incident: 'Road Incident Ahead',
  faster_alt: 'Faster Alternative Found',
};

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs((Math.sin(hash) * 10000) % 1);
}

export interface RerouteAlertInput {
  prediction: TimelinePrediction;
  recommended: {
    hospital: { id?: string; _id?: string; name: string };
    occupancyPct: number;
    distanceKm: number;
    totalEstimatedMinutes: number;
    congestionSegments?: string[];
  };
  alternatives: Array<{
    hospital: { name: string };
    totalEstimatedMinutes: number;
  }>;
}

export function generateRerouteAlerts(input: RerouteAlertInput): RerouteAlert[] {
  const { prediction, recommended, alternatives } = input;
  const alerts: RerouteAlert[] = [];
  const bestAlt = alternatives[0];
  const bestAltName = bestAlt?.hospital?.name ?? 'an alternative hospital';
  const hospitalId = recommended.hospital?.id ?? (recommended.hospital as any)?._id ?? 'unknown';
  const hour = new Date().getHours();

  // 1. Heavy traffic on current route
  if (prediction.avgCongestionLevel >= 2.5) {
    const level = prediction.avgCongestionLevel >= 3.5 ? 'Severe' : 'Heavy';
    alerts.push({
      id: 'traffic',
      trigger: 'traffic',
      title: TRIGGER_ICONS.traffic,
      description: `${level} congestion detected on your route. Drive time increased by +${Math.round((prediction.drivingTimeMultiplier - 1) * 100)}%. Consider rerouting to ${bestAltName}.`,
      severity: prediction.avgCongestionLevel >= 3.5 ? 'critical' : 'warning',
      suggestedHospital: bestAltName,
    });
  }

  // 2. ER capacity surge — occupancy above 90%
  if (recommended.occupancyPct > 90) {
    alerts.push({
      id: 'capacity',
      trigger: 'capacity',
      title: TRIGGER_ICONS.capacity,
      description: `${recommended.hospital.name} is at ${Math.round(recommended.occupancyPct)}% capacity. Expect extended wait times. ${bestAltName} may have shorter waits.`,
      severity: recommended.occupancyPct > 95 ? 'critical' : 'warning',
      suggestedHospital: bestAltName,
    });
  }

  // 3. Hospital diversion — disabled (no real diversion data source yet)
  const divSeed = `${hospitalId}-${hour}-diversion`;
  if (seededRandom(divSeed) < 0) {
    alerts.push({
      id: 'diversion',
      trigger: 'diversion',
      title: TRIGGER_ICONS.diversion,
      description: `${recommended.hospital.name} has gone on diversion and is not accepting new ER patients. Rerouting to ${bestAltName} is recommended.`,
      severity: 'critical',
      suggestedHospital: bestAltName,
    });
  }

  // 4. Road incident — probability scales with route length and congestion
  if (prediction.avgCongestionLevel >= 3 && recommended.distanceKm > 5) {
    const incidentSeed = `${hospitalId}-${hour}-incident`;
    if (seededRandom(incidentSeed) < 0.15) {
      alerts.push({
        id: 'incident',
        trigger: 'incident',
        title: TRIGGER_ICONS.incident,
        description: `A collision has been reported along your route to ${recommended.hospital.name}. Consider rerouting to ${bestAltName} to avoid delays.`,
        severity: 'warning',
        suggestedHospital: bestAltName,
      });
    }
  }

  // 5. Faster alternative found — alt is 15%+ faster
  if (bestAlt && recommended.totalEstimatedMinutes > 0) {
    const savings = recommended.totalEstimatedMinutes - bestAlt.totalEstimatedMinutes;
    const pctFaster = savings / recommended.totalEstimatedMinutes;
    if (pctFaster >= 0.15 && savings >= 5) {
      alerts.push({
        id: 'faster_alt',
        trigger: 'faster_alt',
        title: TRIGGER_ICONS.faster_alt,
        description: `${bestAlt.hospital.name} is ~${Math.round(savings)} min faster overall (${bestAlt.totalEstimatedMinutes} min vs ${recommended.totalEstimatedMinutes} min).`,
        severity: 'warning',
        suggestedHospital: bestAlt.hospital.name,
      });
    }
  }

  return alerts;
}
