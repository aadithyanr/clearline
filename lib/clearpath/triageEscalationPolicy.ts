export type Severity = 'critical' | 'urgent' | 'non-urgent';

export interface TriageEscalationInput {
  severity: Severity;
  confidenceScore?: number;
  highRiskSignals?: string[];
}

export interface TriageEscalationDecision {
  shouldEscalate: boolean;
  escalationLevel: 'dispatch_supervisor' | 'medical_director' | null;
  reason: string;
  policy: {
    severity: Severity;
    confidenceScore: number;
    highRiskSignals: string[];
  };
}

const MIN_URGENT_CONFIDENCE = 0.55;
const MIN_CRITICAL_CONFIDENCE = 0.7;
const MIN_NON_URGENT_CONFIDENCE = 0.75;
const HIGH_RISK_SIGNAL_SET = new Set([
  'chest_pain',
  'stroke_signs',
  'unconscious',
  'not_breathing',
  'massive_bleeding',
]);

function normalizeConfidenceScore(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 0.65;
  return Math.max(0.05, Math.min(0.99, Number(raw.toFixed(2))));
}

export function evaluateTriageEscalationPolicy(input: TriageEscalationInput): TriageEscalationDecision {
  const confidenceScore = normalizeConfidenceScore(input.confidenceScore);
  const highRiskSignals = (input.highRiskSignals ?? []).filter((s) => HIGH_RISK_SIGNAL_SET.has(s));

  if (input.severity === 'critical' && confidenceScore < MIN_CRITICAL_CONFIDENCE) {
    return {
      shouldEscalate: true,
      escalationLevel: 'medical_director',
      reason: `CRITICAL severity with low confidence (${confidenceScore}).`,
      policy: {
        severity: input.severity,
        confidenceScore,
        highRiskSignals,
      },
    };
  }

  if (input.severity === 'urgent' && confidenceScore < MIN_URGENT_CONFIDENCE && highRiskSignals.length > 0) {
    return {
      shouldEscalate: true,
      escalationLevel: 'dispatch_supervisor',
      reason: `URGENT severity has low confidence (${confidenceScore}) with high-risk signals: ${highRiskSignals.join(', ')}.`,
      policy: {
        severity: input.severity,
        confidenceScore,
        highRiskSignals,
      },
    };
  }

  if (input.severity === 'non-urgent' && confidenceScore < MIN_NON_URGENT_CONFIDENCE) {
    return {
      shouldEscalate: true,
      escalationLevel: 'dispatch_supervisor',
      reason: `NON-URGENT severity confidence too low (${confidenceScore}) for safe automation.`,
      policy: {
        severity: input.severity,
        confidenceScore,
        highRiskSignals,
      },
    };
  }

  return {
    shouldEscalate: false,
    escalationLevel: null,
    reason: 'Confidence gate passed for current severity.',
    policy: {
      severity: input.severity,
      confidenceScore,
      highRiskSignals,
    },
  };
}