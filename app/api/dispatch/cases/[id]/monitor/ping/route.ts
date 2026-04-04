import { NextRequest, NextResponse } from 'next/server';
import { readCase, overrideAssignedHospital } from '@/lib/clearpath/caseStore';
import {
  evaluateMonitorPing,
  emitRerouteAlert,
  emitCoordinationTrigger,
  hasRecentCoordinationTrigger,
} from '@/lib/clearpath/routeMonitorService';
import { evaluateCoordinationPolicy } from '@/lib/clearpath/policeTrafficTrigger';
import { hasActiveRouteBlockIncident } from '@/lib/clearpath/incidentIngestionService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const baselineEtaMinutes = typeof body?.baselineEtaMinutes === 'number' ? body.baselineEtaMinutes : undefined;
    const currentEtaMinutes = typeof body?.currentEtaMinutes === 'number' ? body.currentEtaMinutes : undefined;
    const roadClosureReportedInput = Boolean(body?.roadClosureReported);

    const currentCase = await readCase(id);
    if (!currentCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const incidentCheck = await hasActiveRouteBlockIncident({
      city: currentCase.city || 'pune',
      caseId: id,
    });

    const roadClosureReported = roadClosureReportedInput || incidentCheck.hasBlock;

    const monitor = await evaluateMonitorPing({
      caseId: id,
      baselineEtaMinutes,
      currentEtaMinutes,
      roadClosureReported,
    });

    let rerouted = false;
    let rerouteHospitalName: string | null = null;
    let coordinationTriggered = false;
    let coordinationReason: string | null = null;
    let coordinationChannel: 'traffic' | 'police_and_traffic' | null = null;

    if (monitor.closureDetected) {
      const fallback = Array.isArray(currentCase.alternatives) ? currentCase.alternatives[0] : null;
      if (fallback) {
        const success = await overrideAssignedHospital(
          id,
          fallback,
          'auto-route-monitor',
          `Automatic reroute triggered: ${monitor.reason}`,
        );

        if (success) {
          rerouted = true;
          rerouteHospitalName = fallback?.hospital?.name ?? null;
          const incidentHint = incidentCheck.incident
            ? `Incident ${incidentCheck.incident.type}: ${incidentCheck.incident.description}`
            : monitor.reason;
          await emitRerouteAlert(
            id,
            `Auto-rerouted due to closure/drift: ${incidentHint}`,
            monitor.etaDriftMinutes,
          );
        }
      }
    }

    const coordination = evaluateCoordinationPolicy({
      emergencyCase: currentCase,
      closureDetected: monitor.closureDetected,
      etaDriftMinutes: monitor.etaDriftMinutes,
      baselineEtaMinutes,
      currentEtaMinutes,
    });

    if (coordination.shouldTrigger && coordination.channel) {
      const duplicate = await hasRecentCoordinationTrigger(id);
      if (!duplicate) {
        await emitCoordinationTrigger({
          caseId: id,
          reason: coordination.reason,
          etaDriftMinutes: monitor.etaDriftMinutes,
          channel: coordination.channel,
          severity: currentCase.triage.severity,
          baselineEtaMinutes,
          currentEtaMinutes,
        });
        coordinationTriggered = true;
        coordinationReason = coordination.reason;
        coordinationChannel = coordination.channel;
      }
    }

    return NextResponse.json({
      caseId: id,
      closureDetected: monitor.closureDetected,
      reason: monitor.reason,
      externalIncident: incidentCheck.incident ?? null,
      etaDriftMinutes: monitor.etaDriftMinutes,
      rerouted,
      rerouteHospitalName,
      coordinationTriggered,
      coordinationReason,
      coordinationChannel,
    });
  } catch (err: unknown) {
    console.error('[POST /api/dispatch/cases/[id]/monitor/ping]', err);
    const message = err instanceof Error ? err.message : 'Failed to process monitor ping';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
