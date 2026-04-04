import { NextRequest, NextResponse } from 'next/server';
import {
  acknowledgeHospitalAssignment,
  overrideAssignedHospital,
  readLiveCases,
  rejectHospitalAndAssignFallback,
} from '@/lib/clearpath/caseStore';
import { emitRerouteAlert, evaluateMonitorPing } from '@/lib/clearpath/routeMonitorService';
import { createExternalIncident } from '@/lib/clearpath/incidentIngestionService';

export const dynamic = 'force-dynamic';

type Scenario =
  | 'closure_reroute'
  | 'obstacle_reroute'
  | 'icu_unavailable'
  | 'hospital_ack'
  | 'hospital_reject'
  | 'external_incident'
  | 'intake_packet'
  | 'police_traffic'
  | 'triage_escalation';

type SimCase = {
  caseId: string;
  status: string;
  assignedHospital?: { hospital?: { id?: string; name?: string }; totalEstimatedMinutes?: number };
  alternatives?: Array<{ hospital?: { name?: string } }>;
};

function pickCaseByIdOrFirst(cases: SimCase[], caseId: string | undefined, status: string) {
  if (caseId) {
    return cases.find((c) => c.caseId === caseId) || null;
  }
  return cases.find((c) => c.status === status) || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenario = body?.scenario as Scenario | undefined;
    const caseId = typeof body?.caseId === 'string' ? body.caseId : undefined;

    if (!scenario) {
      return NextResponse.json({ error: 'scenario is required' }, { status: 400 });
    }

    const liveCases = (await readLiveCases()) as unknown as SimCase[];

    if (scenario === 'closure_reroute' || scenario === 'obstacle_reroute') {
      const target = pickCaseByIdOrFirst(liveCases, caseId, 'en_route');
      if (!target) {
        return NextResponse.json({ error: 'No live case available for reroute simulation' }, { status: 404 });
      }

      const baselineEtaMinutes =
        typeof body?.baselineEtaMinutes === 'number'
          ? body.baselineEtaMinutes
          : Number(target.assignedHospital?.totalEstimatedMinutes ?? 20);

      const currentEtaMinutes =
        typeof body?.currentEtaMinutes === 'number' ? body.currentEtaMinutes : baselineEtaMinutes + 12;

      const monitor = await evaluateMonitorPing({
        caseId: target.caseId,
        baselineEtaMinutes,
        currentEtaMinutes,
        roadClosureReported: true,
      });

      let rerouted = false;
      let rerouteHospitalName: string | null = null;

      const fallback = Array.isArray(target.alternatives) ? target.alternatives[0] : null;
      if (monitor.closureDetected && fallback) {
        const success = await overrideAssignedHospital(
          target.caseId,
          fallback,
          'demo-simulator',
          `Demo simulation: road closure triggered (${monitor.reason})`,
        );

        if (success) {
          rerouted = true;
          rerouteHospitalName = fallback?.hospital?.name ?? null;
          await emitRerouteAlert(
            target.caseId,
            scenario === 'obstacle_reroute'
              ? `Demo reroute executed: Obstacle detected on active corridor (${monitor.reason})`
              : `Demo reroute executed: ${monitor.reason}`,
            monitor.etaDriftMinutes,
          );
        }
      }

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        trigger: scenario === 'obstacle_reroute' ? 'route_obstacle' : 'road_closure',
        closureDetected: monitor.closureDetected,
        reason: monitor.reason,
        etaDriftMinutes: monitor.etaDriftMinutes,
        rerouted,
        rerouteHospitalName,
      });
    }

    if (scenario === 'icu_unavailable') {
      const target = caseId
        ? liveCases.find((c) => c.caseId === caseId)
        : liveCases.find((c) => c.assignedHospital?.hospital?.id) || null;
      if (!target) {
        return NextResponse.json({ error: 'No live case available for ICU outage simulation' }, { status: 404 });
      }

      const assignedHospitalId = target.assignedHospital?.hospital?.id;
      if (!assignedHospitalId) {
        return NextResponse.json({ error: 'Assigned hospital id missing for selected case' }, { status: 400 });
      }

      const result = await rejectHospitalAndAssignFallback(
        target.caseId,
        assignedHospitalId,
        'demo-simulator',
        'ICU beds became unavailable suddenly; fallback reroute required',
      );

      if (!result.success) {
        return NextResponse.json({ error: result.message || 'ICU outage simulation failed' }, { status: 409 });
      }

      await emitRerouteAlert(
        target.caseId,
        'Hospital ICU unavailable. Auto-fallback reroute executed.',
      );

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        trigger: 'icu_capacity_drop',
        rerouted: true,
        rerouteHospitalName: result.fallbackHospitalName,
        reason: 'Primary hospital ICU unavailable; patient reassigned to fallback facility.',
      });
    }

    if (scenario === 'hospital_reject') {
      const target = pickCaseByIdOrFirst(liveCases, caseId, 'awaiting_hospital_ack');
      if (!target) {
        return NextResponse.json({ error: 'No awaiting_hospital_ack case available for reject simulation' }, { status: 404 });
      }

      const assignedHospitalId = target.assignedHospital?.hospital?.id;
      if (!assignedHospitalId) {
        return NextResponse.json({ error: 'Assigned hospital id missing for selected case' }, { status: 400 });
      }

      const result = await rejectHospitalAndAssignFallback(
        target.caseId,
        assignedHospitalId,
        'demo-simulator',
        'Demo simulation: hospital rejected intake',
      );

      if (!result.success) {
        return NextResponse.json({ error: result.message || 'Reject simulation failed' }, { status: 409 });
      }

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        success: true,
        fallbackHospitalName: result.fallbackHospitalName,
      });
    }

    if (scenario === 'hospital_ack') {
      const target = pickCaseByIdOrFirst(liveCases, caseId, 'awaiting_hospital_ack');
      if (!target) {
        return NextResponse.json({ error: 'No awaiting_hospital_ack case available for ack simulation' }, { status: 404 });
      }

      const assignedHospitalId = target.assignedHospital?.hospital?.id;
      if (!assignedHospitalId) {
        return NextResponse.json({ error: 'Assigned hospital id missing for selected case' }, { status: 400 });
      }

      const success = await acknowledgeHospitalAssignment(
        target.caseId,
        assignedHospitalId,
        'demo-simulator',
        'Demo simulation: hospital acknowledged intake',
      );

      if (!success) {
        return NextResponse.json({ error: 'Ack simulation failed' }, { status: 409 });
      }

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        success: true,
      });
    }

    if (scenario === 'intake_packet') {
      const target = pickCaseByIdOrFirst(liveCases, caseId, 'en_route');
      if (!target) {
        return NextResponse.json({ error: 'No en_route case available for intake packet simulation' }, { status: 404 });
      }

      const sendRes = await fetch(`${req.nextUrl.origin}/api/dispatch/cases/${target.caseId}/send-intake-packet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: 'demo-simulator' }),
      });

      const sendPayload = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        return NextResponse.json({ error: sendPayload?.error || 'Failed to send intake packet' }, { status: sendRes.status });
      }

      const hospitalId = sendPayload?.packet?.hospitalId as string | undefined;
      if (!hospitalId) {
        return NextResponse.json({ error: 'Simulation could not resolve hospital id' }, { status: 400 });
      }

      const receiveRes = await fetch(`${req.nextUrl.origin}/api/hospital/${hospitalId}/receive-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetId: sendPayload?.packet?.packetId,
          receivedBy: 'demo-simulator',
          notes: 'Demo simulation auto-ack for intake packet',
        }),
      });

      const receivePayload = await receiveRes.json().catch(() => ({}));
      if (!receiveRes.ok) {
        return NextResponse.json({ error: receivePayload?.error || 'Failed to acknowledge intake packet' }, { status: receiveRes.status });
      }

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        packet: sendPayload.packet,
        acknowledged: receivePayload.packet,
      });
    }

    if (scenario === 'police_traffic') {
      const target = caseId ? liveCases.find((c) => c.caseId === caseId) : liveCases[0];
      if (!target) {
        return NextResponse.json({ error: 'No live case available for police_traffic simulation' }, { status: 404 });
      }

      const baselineEtaMinutes =
        typeof body?.baselineEtaMinutes === 'number'
          ? body.baselineEtaMinutes
          : Number(target.assignedHospital?.totalEstimatedMinutes ?? 20);

      const currentEtaMinutes =
        typeof body?.currentEtaMinutes === 'number' ? body.currentEtaMinutes : baselineEtaMinutes + 14;

      const triggerRes = await fetch(`${req.nextUrl.origin}/api/alerts/police-traffic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: target.caseId,
          roadClosureReported: true,
          baselineEtaMinutes,
          currentEtaMinutes,
          forceTrigger: Boolean(body?.forceTrigger),
        }),
      });

      const triggerPayload = await triggerRes.json().catch(() => ({}));
      if (!triggerRes.ok) {
        return NextResponse.json({ error: triggerPayload?.error || 'Failed to trigger police/traffic simulation' }, { status: triggerRes.status });
      }

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        ...triggerPayload,
      });
    }

    if (scenario === 'triage_escalation') {
      const target = caseId ? liveCases.find((c) => c.caseId === caseId) : liveCases[0];
      if (!target) {
        return NextResponse.json({ error: 'No live case available for triage_escalation simulation' }, { status: 404 });
      }

      const confidenceScore = typeof body?.confidenceScore === 'number' ? body.confidenceScore : 0.42;

      const escalateRes = await fetch(`${req.nextUrl.origin}/api/alerts/triage-escalation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: target.caseId,
          confidenceScore,
        }),
      });

      const escalatePayload = await escalateRes.json().catch(() => ({}));
      if (!escalateRes.ok) {
        return NextResponse.json({ error: escalatePayload?.error || 'Failed to run triage escalation simulation' }, { status: escalateRes.status });
      }

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        ...escalatePayload,
      });
    }

    if (scenario === 'external_incident') {
      const target = caseId ? liveCases.find((c) => c.caseId === caseId) : liveCases[0];
      if (!target) {
        return NextResponse.json({ error: 'No live case available for external incident simulation' }, { status: 404 });
      }

      const incident = await createExternalIncident({
        type: 'road_closure',
        city: (target as any).city || 'pune',
        caseId: target.caseId,
        description: 'External feed: arterial road closure near active ambulance corridor',
        source: 'simulation',
        ttlMinutes: 25,
      });

      const baselineEtaMinutes =
        typeof body?.baselineEtaMinutes === 'number'
          ? body.baselineEtaMinutes
          : Number(target.assignedHospital?.totalEstimatedMinutes ?? 20);

      const currentEtaMinutes =
        typeof body?.currentEtaMinutes === 'number' ? body.currentEtaMinutes : baselineEtaMinutes + 10;

      const monitor = await evaluateMonitorPing({
        caseId: target.caseId,
        baselineEtaMinutes,
        currentEtaMinutes,
        roadClosureReported: true,
      });

      return NextResponse.json({
        scenario,
        caseId: target.caseId,
        incident,
        closureDetected: monitor.closureDetected,
        reason: monitor.reason,
        etaDriftMinutes: monitor.etaDriftMinutes,
      });
    }

    return NextResponse.json({ error: `Unsupported scenario: ${String(scenario)}` }, { status: 400 });
  } catch (err: unknown) {
    console.error('[POST /api/hospital/simulation]', err);
    const message = err instanceof Error ? err.message : 'Failed to run simulation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
