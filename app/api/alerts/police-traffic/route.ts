import { NextRequest, NextResponse } from 'next/server';
import { readCase } from '@/lib/clearpath/caseStore';
import {
  emitCoordinationTrigger,
  hasRecentCoordinationTrigger,
} from '@/lib/clearpath/routeMonitorService';
import { evaluateCoordinationPolicy } from '@/lib/clearpath/policeTrafficTrigger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = typeof body?.caseId === 'string' ? body.caseId : '';
    const baselineEtaMinutes =
      typeof body?.baselineEtaMinutes === 'number' ? body.baselineEtaMinutes : undefined;
    const currentEtaMinutes =
      typeof body?.currentEtaMinutes === 'number' ? body.currentEtaMinutes : undefined;
    const roadClosureReported = Boolean(body?.roadClosureReported);

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    const emergencyCase = await readCase(caseId);
    if (!emergencyCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const defaultBaseline = Number(emergencyCase.assignedHospital?.totalEstimatedMinutes ?? 20);
    const defaultCurrent = Number(
      (emergencyCase.assignedHospital?.drivingTimeMinutes ?? defaultBaseline) +
        (emergencyCase.assignedHospital?.waitMinutes ?? 0),
    );

    const effectiveBaseline = baselineEtaMinutes ?? defaultBaseline;
    const effectiveCurrent = currentEtaMinutes ?? defaultCurrent;
    const etaDriftMinutes = Math.max(0, Math.round(effectiveCurrent - effectiveBaseline));

    const decision = evaluateCoordinationPolicy({
      emergencyCase,
      closureDetected: roadClosureReported,
      etaDriftMinutes,
      baselineEtaMinutes: effectiveBaseline,
      currentEtaMinutes: effectiveCurrent,
    });

    if (!decision.shouldTrigger || !decision.channel) {
      return NextResponse.json({
        caseId,
        triggered: false,
        reason: decision.reason,
        policy: decision.policy,
      });
    }

    const duplicate = await hasRecentCoordinationTrigger(caseId);
    if (duplicate) {
      return NextResponse.json({
        caseId,
        triggered: false,
        duplicateSuppressed: true,
        reason: 'Recent coordination trigger already exists for this case.',
        policy: decision.policy,
      });
    }

    await emitCoordinationTrigger({
      caseId,
      reason: decision.reason,
      etaDriftMinutes,
      channel: decision.channel,
      severity: emergencyCase.triage.severity,
      baselineEtaMinutes: effectiveBaseline,
      currentEtaMinutes: effectiveCurrent,
    });

    return NextResponse.json({
      caseId,
      triggered: true,
      channel: decision.channel,
      reason: decision.reason,
      policy: decision.policy,
    });
  } catch (err: unknown) {
    console.error('[POST /api/alerts/police-traffic]', err);
    const message = err instanceof Error ? err.message : 'Failed to trigger coordination alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
