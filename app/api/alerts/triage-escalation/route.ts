import { NextRequest, NextResponse } from 'next/server';
import { readCase } from '@/lib/clearpath/caseStore';
import {
  emitTriageEscalation,
  hasRecentTriageEscalation,
} from '@/lib/clearpath/routeMonitorService';
import { evaluateTriageEscalationPolicy } from '@/lib/clearpath/triageEscalationPolicy';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = typeof body?.caseId === 'string' ? body.caseId : '';

    const payloadSeverity = body?.severity as 'critical' | 'urgent' | 'non-urgent' | undefined;
    const payloadConfidence =
      typeof body?.confidenceScore === 'number' ? body.confidenceScore : undefined;
    const payloadSignals = Array.isArray(body?.highRiskSignals)
      ? body.highRiskSignals.filter((x: unknown) => typeof x === 'string')
      : [];

    let severity = payloadSeverity;
    let confidenceScore = payloadConfidence;
    let highRiskSignals = payloadSignals;

    if (caseId) {
      const emergencyCase = await readCase(caseId);
      if (!emergencyCase) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }

      severity = emergencyCase.triage?.severity;
      confidenceScore =
        typeof emergencyCase.triage?.confidenceScore === 'number'
          ? emergencyCase.triage.confidenceScore
          : confidenceScore;

      const freeText = String(emergencyCase.patientMessage || '').toLowerCase();
      highRiskSignals = [
        freeText.includes('chest pain') ? 'chest_pain' : null,
        freeText.includes('stroke') ? 'stroke_signs' : null,
        freeText.includes('unconscious') ? 'unconscious' : null,
        freeText.includes('not breathing') ? 'not_breathing' : null,
        freeText.includes('bleeding') ? 'massive_bleeding' : null,
        ...highRiskSignals,
      ].filter(Boolean) as string[];
    }

    if (!severity) {
      return NextResponse.json({
        error: 'severity is required when caseId is not provided',
      }, { status: 400 });
    }

    const decision = evaluateTriageEscalationPolicy({
      severity,
      confidenceScore,
      highRiskSignals,
    });

    if (!caseId || !decision.shouldEscalate || !decision.escalationLevel) {
      return NextResponse.json({
        caseId: caseId || null,
        escalated: false,
        reason: decision.reason,
        policy: decision.policy,
      });
    }

    const duplicate = await hasRecentTriageEscalation(caseId);
    if (duplicate) {
      return NextResponse.json({
        caseId,
        escalated: false,
        duplicateSuppressed: true,
        reason: 'Recent triage escalation already emitted for this case.',
        policy: decision.policy,
      });
    }

    await emitTriageEscalation({
      caseId,
      reason: decision.reason,
      severity: decision.policy.severity,
      confidenceScore: decision.policy.confidenceScore,
      escalationLevel: decision.escalationLevel,
    });

    return NextResponse.json({
      caseId,
      escalated: true,
      escalationLevel: decision.escalationLevel,
      reason: decision.reason,
      policy: decision.policy,
    });
  } catch (err: unknown) {
    console.error('[POST /api/alerts/triage-escalation]', err);
    const message = err instanceof Error ? err.message : 'Failed to evaluate triage escalation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
