export interface ClosureDetectionInput {
  roadClosureReported?: boolean;
  baselineEtaMinutes?: number;
  currentEtaMinutes?: number;
}

export interface ClosureDetectionResult {
  closureDetected: boolean;
  etaDriftMinutes: number;
  reason: string;
}

const ETA_DRIFT_THRESHOLD_MINUTES = 8;

export function detectClosureOrSevereDrift(input: ClosureDetectionInput): ClosureDetectionResult {
  const baseline = Number(input.baselineEtaMinutes || 0);
  const current = Number(input.currentEtaMinutes || 0);
  const etaDriftMinutes = baseline > 0 && current > 0 ? current - baseline : 0;

  if (input.roadClosureReported) {
    return {
      closureDetected: true,
      etaDriftMinutes,
      reason: 'Road closure reported by telemetry',
    };
  }

  if (etaDriftMinutes >= ETA_DRIFT_THRESHOLD_MINUTES) {
    return {
      closureDetected: true,
      etaDriftMinutes,
      reason: `ETA drift exceeded threshold (+${etaDriftMinutes} min)`,
    };
  }

  return {
    closureDetected: false,
    etaDriftMinutes,
    reason: 'No closure condition detected',
  };
}
