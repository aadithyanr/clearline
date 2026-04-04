import type { EmergencyCase } from './caseTypes';

export type CoordinationChannel = 'traffic' | 'police_and_traffic';

export interface CoordinationPolicyInput {
  emergencyCase: EmergencyCase;
  closureDetected: boolean;
  etaDriftMinutes?: number;
  baselineEtaMinutes?: number;
  currentEtaMinutes?: number;
}

export interface CoordinationDecision {
  shouldTrigger: boolean;
  channel?: CoordinationChannel;
  reason: string;
  policy: {
    severity: EmergencyCase['triage']['severity'];
    closureDetected: boolean;
    etaDriftMinutes: number;
    baselineEtaMinutes?: number;
    currentEtaMinutes?: number;
  };
}

const CRITICAL_DRIFT_THRESHOLD_MINUTES = 8;
const CRITICAL_GROWTH_FACTOR = 1.4;
const URGENT_DRIFT_WITH_CLOSURE_MINUTES = 15;

export function evaluateCoordinationPolicy(input: CoordinationPolicyInput): CoordinationDecision {
  const severity = input.emergencyCase.triage.severity;
  const drift = Math.max(0, Number(input.etaDriftMinutes ?? 0));
  const baseline = input.baselineEtaMinutes;
  const current = input.currentEtaMinutes;

  const etaGrowthExceeded =
    typeof baseline === 'number' && baseline > 0 && typeof current === 'number'
      ? current >= baseline * CRITICAL_GROWTH_FACTOR
      : false;

  const severeCriticalDelay = drift >= CRITICAL_DRIFT_THRESHOLD_MINUTES || etaGrowthExceeded;
  const urgentClosureDelay = input.closureDetected && drift >= URGENT_DRIFT_WITH_CLOSURE_MINUTES;

  if (severity === 'critical' && (input.closureDetected || severeCriticalDelay)) {
    const reasonBits: string[] = ['CRITICAL case'];
    if (input.closureDetected) reasonBits.push('road closure detected');
    if (severeCriticalDelay) reasonBits.push(`ETA drift ${drift}m exceeded policy threshold`);

    return {
      shouldTrigger: true,
      channel: 'police_and_traffic',
      reason: `${reasonBits.join(', ')}.`,
      policy: {
        severity,
        closureDetected: input.closureDetected,
        etaDriftMinutes: drift,
        baselineEtaMinutes: baseline,
        currentEtaMinutes: current,
      },
    };
  }

  if (severity === 'urgent' && urgentClosureDelay) {
    return {
      shouldTrigger: true,
      channel: 'traffic',
      reason: `URGENT case with closure and severe drift (${drift}m).`,
      policy: {
        severity,
        closureDetected: input.closureDetected,
        etaDriftMinutes: drift,
        baselineEtaMinutes: baseline,
        currentEtaMinutes: current,
      },
    };
  }

  return {
    shouldTrigger: false,
    reason: 'Coordination trigger policy not satisfied.',
    policy: {
      severity,
      closureDetected: input.closureDetected,
      etaDriftMinutes: drift,
      baselineEtaMinutes: baseline,
      currentEtaMinutes: current,
    },
  };
}