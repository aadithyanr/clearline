import { NextRequest, NextResponse } from 'next/server';
import { buildAuditEvent } from '@/lib/clearpath/auditEventTypes';
import { readCase } from '@/lib/clearpath/caseStore';
import { createIntakePacket } from '@/lib/clearpath/intakePacketStore';
import { getDb } from '@/lib/clearpath/mongoClient';

async function appendTimeline(caseId: string, event: ReturnType<typeof buildAuditEvent>) {
  const db = await getDb();
  await db.collection('cases').updateOne(
    { caseId },
    {
      $set: { updatedAt: event.ts },
      $push: { timeline: event },
    } as never,
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const actorId = typeof body?.actorId === 'string' ? body.actorId : 'dispatch-ui';

    const c = await readCase(id);
    if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const hospitalId = c.assignedHospital?.hospital?.id;
    const hospitalName = c.assignedHospital?.hospital?.name;
    if (!hospitalId) {
      return NextResponse.json({ error: 'Assigned hospital is missing' }, { status: 400 });
    }

    const packet = await createIntakePacket({
      caseId: c.caseId,
      hospitalId,
      hospitalName,
      payload: {
        severity: c.triage?.severity,
        predictedNeeds: c.triage?.predictedNeeds,
        patientMessage: c.patientMessage,
        etaMinutes: c.assignedHospital?.totalEstimatedMinutes,
        location: c.userLocation,
      },
    });

    const now = new Date().toISOString();
    await appendTimeline(
      c.caseId,
      buildAuditEvent(now, {
        event: `Pre-arrival intake packet sent to ${hospitalName ?? hospitalId}`,
        eventType: 'status_transition',
        actorId,
        reason: `Packet ${packet.packetId} dispatched`,
      }),
    );

    return NextResponse.json({
      success: true,
      caseId: c.caseId,
      packet,
    });
  } catch (err: unknown) {
    console.error('[POST /api/dispatch/cases/[id]/send-intake-packet]', err);
    const message = err instanceof Error ? err.message : 'Failed to send intake packet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
