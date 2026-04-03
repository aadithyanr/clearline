import { ScoredHospital, SymptomsPayload } from './types';
import { getBatchDirections } from './mapboxDirections';
import { getAdjustedDrivingTime, getAdjustedWaitTime, getTemporalContext } from './temporalPatterns';

// Severity-based weight profiles
const WEIGHTS: Record<string, { drive: number; wait: number; occ: number; spec: number }> = {
  critical:    { drive: 5.0, wait: 0.5, occ: 0.3, spec: 4.0 },
  urgent:      { drive: 2.0, wait: 3.0, occ: 1.5, spec: 2.5 },
  'non-urgent':{ drive: 1.0, wait: 4.0, occ: 2.0, spec: 0.5 },
};

// Map triage predictedNeeds → hospital specialty tags
const NEEDS_TO_SPECIALTIES: Record<string, string[]> = {
  cardiac:      ['cardiac'],
  ICU:          ['cardiac', 'general'],
  ventilator:   ['respiratory', 'cardiac'],
  neurosurgeon: ['neurology', 'stroke'],
  trauma:       ['trauma'],
  burns:        ['burns'],
  paediatrics:  ['paediatrics'],
  obstetrics:   ['obstetrics'],
  ophthalmology:['ophthalmology'],
  dialysis:     ['dialysis', 'nephrology'],
  respiratory:  ['respiratory'],
  general:      [],
};

// Legacy symptom-boolean → specialty map (kept for backward compat)
const SYMPTOM_SPECIALTY_MAP: Record<string, string[]> = {
  chestPain:        ['cardiac'],
  shortnessOfBreath:['cardiac', 'respiratory'],
  injuryOrBleeding: ['trauma'],
  dizziness:        ['neurology', 'stroke'],
  severeHeadache:   ['neurology', 'stroke'],
};

function getSpecialtyScore(
  hospital: any,
  symptoms?: SymptomsPayload | null,
  predictedNeeds?: string[],
): { score: number; match: boolean } {
  const needed: string[] = [];

  // Prefer predictedNeeds from triage (richer signal)
  if (predictedNeeds?.length) {
    for (const need of predictedNeeds) {
      const mapped = NEEDS_TO_SPECIALTIES[need];
      if (mapped) needed.push(...mapped);
    }
  } else if (symptoms) {
    // Fall back to legacy boolean symptoms
    for (const [key, specialties] of Object.entries(SYMPTOM_SPECIALTY_MAP)) {
      if ((symptoms as any)[key]) needed.push(...specialties);
    }
  }

  if (needed.length === 0) return { score: 0, match: false };

  const has: string[] = hospital.specialties ?? [];
  const matched = needed.filter((s) => has.includes(s)).length;
  const match = matched > 0;
  // Penalty: higher when fewer specialties match (0 if perfect match)
  const score = (1 - matched / needed.length) * 60;
  return { score, match };
}

export async function scoreAndRankHospitals(
  userLat: number,
  userLng: number,
  severity: string,
  hospitals: any[],
  snapshots: any[],
  symptoms?: SymptomsPayload | null,
  predictedNeeds?: string[],
  imageSeverity?: 'high' | 'low',
): Promise<{ recommended: ScoredHospital; alternatives: ScoredHospital[] } | null> {
  if (!hospitals.length) return null;

  // If image indicates high severity, force critical and filter to trauma centers
  let effectiveSeverity = severity;
  let filteredHospitals = hospitals;
  if (imageSeverity === 'high') {
    effectiveSeverity = 'critical';
    filteredHospitals = hospitals.filter(h => h.specialties?.includes('trauma'));
    if (filteredHospitals.length === 0) {
      // Fallback to all if no trauma centers
      filteredHospitals = hospitals;
    }
  }

  // For critical/urgent, drop clinics that are too small to handle real emergencies
  const minErBeds = effectiveSeverity === 'critical' ? 3 : effectiveSeverity === 'urgent' ? 2 : 0;
  const capable = minErBeds > 0
    ? filteredHospitals.filter((h) => (h.erBeds ?? 0) >= minErBeds)
    : filteredHospitals;
  // Safety net: if filtering leaves nothing, fall back to all hospitals
  const pool = capable.length >= 3 ? capable : filteredHospitals;

  const now = new Date();
  const weights = WEIGHTS[effectiveSeverity] ?? WEIGHTS['non-urgent'];
  const context = getTemporalContext(now);

  // Build congestion lookup
  const congestionMap: Record<string, { occupancyPct: number; waitMinutes: number }> = {};
  for (const s of snapshots) {
    congestionMap[s.hospitalId] = { occupancyPct: s.occupancyPct, waitMinutes: s.waitMinutes };
  }

  // Get real driving times from Mapbox Directions API (parallel)
  const destinations = pool.map((h: any) => ({
    lng: h.longitude,
    lat: h.latitude,
    id: h._id?.toString() ?? h.id,
  }));

  const directionsMap = await getBatchDirections(userLng, userLat, destinations);

  // Score each hospital
  const scored: ScoredHospital[] = pool.map((h: any) => {
    const hId = h._id?.toString() ?? h.id;
    const congestion = congestionMap[hId] ?? { occupancyPct: 70, waitMinutes: 90 };
    const directions = directionsMap.get(hId);

    const rawDriveTime = directions?.drivingTimeMinutes ?? 15;
    const distanceKm = directions?.distanceKm ?? 10;
    const routeGeometry = directions?.routeGeometry ?? null;
    const congestionSegments = directions?.congestionSegments;

    // Apply temporal adjustments
    const drivingTimeMinutes = getAdjustedDrivingTime(rawDriveTime, distanceKm, now);
    const adjustedWaitMinutes = getAdjustedWaitTime(congestion.waitMinutes, now);

    // Occupancy penalty: 0 if < 70%, scales up to 100
    const occupancyPenalty = Math.max(0, ((congestion.occupancyPct - 70) / 30) * 100);

    // Specialty match
    const specialty = getSpecialtyScore(h, symptoms, predictedNeeds);

    // Dynamic Equipment Constraint Layer
    let equipmentPenalty = 0;
    const hSeed = hId.charCodeAt(hId.length - 1); // deterministic logic for demo
    // Predict what hardware the user needs
    let needsVentilator = predictedNeeds?.includes('ventilator') || predictedNeeds?.includes('respiratory') || symptoms?.shortnessOfBreath;
    let needsBurnUnit = predictedNeeds?.includes('burns');
    
    // Check if hospital has it (we use the deterministic seed since mongo doesn't have real hardware sensors)
    const hasVentilators = h.specialties?.includes('respiratory') || h.totalBeds > 50 || (hSeed % 3 !== 0);
    const hasBurnUnit = h.specialties?.includes('burns') || (hSeed % 5 === 0);

    if (needsVentilator && !hasVentilators) {
      equipmentPenalty += 500; // Hard constraint penalty
    }
    if (needsBurnUnit && !hasBurnUnit) {
      equipmentPenalty += 1000; // Hard constraint penalty
    }

    // Compute weighted score (lower = better)
    const score =
      weights.drive * drivingTimeMinutes +
      weights.wait * adjustedWaitMinutes +
      weights.occ * occupancyPenalty +
      weights.spec * specialty.score +
      equipmentPenalty; // Enforce equipment constraints

    const totalEstimatedMinutes = Math.round(drivingTimeMinutes + adjustedWaitMinutes);

    return {
      hospital: h,
      score: Math.round(score * 10) / 10,
      drivingTimeMinutes: Math.round(drivingTimeMinutes),
      waitMinutes: congestion.waitMinutes,
      adjustedWaitMinutes,
      distanceKm: Math.round(distanceKm * 10) / 10,
      occupancyPct: congestion.occupancyPct,
      specialtyMatch: specialty.match,
      routeGeometry,
      congestionSegments,
      totalEstimatedMinutes,
      reason: '',
    };
  });

  // Sort by score (ascending = best first)
  scored.sort((a, b) => a.score - b.score);

  // Generate reasons
  scored[0].reason = generateReason(scored[0], severity, context);
  for (let i = 1; i < scored.length; i++) {
    scored[i].reason = generateAlternativeReason(scored[i], scored[0]);
  }

  return {
    recommended: scored[0],
    alternatives: scored.slice(1, 3),
  };
}

function generateReason(h: ScoredHospital, severity: string, context: string): string {
  const parts: string[] = [];

  if (severity === 'critical') {
    parts.push(`Fastest route: ${h.drivingTimeMinutes} min drive with ${context}.`);
    if (h.specialtyMatch) parts.push('This hospital has matching specialty care.');
  } else if (severity === 'urgent') {
    parts.push(
      `Best balance of ${h.drivingTimeMinutes} min drive + ~${h.adjustedWaitMinutes} min wait (${context}).`
    );
  } else {
    parts.push(
      `Lowest total wait: ~${h.totalEstimatedMinutes} min total (${h.drivingTimeMinutes} drive + ${h.adjustedWaitMinutes} wait). ${h.occupancyPct}% occupancy.`
    );
  }

  return parts.join(' ');
}

function generateAlternativeReason(alt: ScoredHospital, best: ScoredHospital): string {
  const timeDiff = alt.totalEstimatedMinutes - best.totalEstimatedMinutes;
  if (timeDiff > 0) {
    return `~${timeDiff} min longer total, but ${alt.occupancyPct}% occupancy.`;
  }
  return `${alt.distanceKm} km away, ${alt.occupancyPct}% occupancy.`;
}
