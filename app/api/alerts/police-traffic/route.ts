import { NextRequest, NextResponse } from 'next/server';
import { readCase } from '@/lib/clearpath/caseStore';
import {
  emitCoordinationTrigger,
  hasRecentCoordinationTrigger,
  readRecentMonitorEvents,
} from '@/lib/clearpath/routeMonitorService';
import { evaluateCoordinationPolicy } from '@/lib/clearpath/policeTrafficTrigger';

export async function GET(req: NextRequest) {
  try {
    const caseId = req.nextUrl.searchParams.get('caseId') || undefined;
    const limitRaw = Number(req.nextUrl.searchParams.get('limit') || 30);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 30;

    const now = Date.now();
    const sinceTs = now - 1000 * 60 * 60 * 24 * 7; // last 7 days
    const events = await readRecentMonitorEvents(sinceTs, 500);

    const filtered = events
      .filter((e) => e.type === 'coordination_triggered')
      .filter((e) => (caseId ? e.caseId === caseId : true))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit)
      .map((e) => ({
        caseId: e.caseId,
        ts: e.ts,
        reason: e.reason,
        channel: e.coordination?.channel ?? 'traffic',
        severity: e.coordination?.severity ?? 'urgent',
        etaDriftMinutes: e.etaDriftMinutes ?? null,
      }));

    return NextResponse.json({ events: filtered });
  } catch (err: unknown) {
    console.error('[GET /api/alerts/police-traffic]', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch police coordination register';
    return NextResponse.json({ error: message, events: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = typeof body?.caseId === 'string' ? body.caseId : '';
    const baselineEtaMinutes =
      typeof body?.baselineEtaMinutes === 'number' ? body.baselineEtaMinutes : undefined;
    const currentEtaMinutes =
      typeof body?.currentEtaMinutes === 'number' ? body.currentEtaMinutes : undefined;
    const roadClosureReported = Boolean(body?.roadClosureReported);
    const forceTrigger = Boolean(body?.forceTrigger);

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    const emergencyCase = await readCase(caseId);
    if (!emergencyCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const ah = emergencyCase.assignedHospital as any;
    const defaultBaseline = Number(ah?.totalEstimatedMinutes ?? 20);
    const defaultCurrent = Number(
      (ah?.drivingTimeMinutes ?? defaultBaseline) +
        (ah?.waitMinutes ?? 0),
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
    if (duplicate && !forceTrigger) {
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
