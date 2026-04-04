import { NextRequest, NextResponse } from 'next/server';
import { buildAuditEvent } from '@/lib/clearpath/auditEventTypes';
import { acknowledgeIntakePacket, readIntakePackets } from '@/lib/clearpath/intakePacketStore';
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
    const { id: hospitalId } = await params;
    if (!hospitalId) return NextResponse.json({ error: 'hospital id required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const packetId = typeof body?.packetId === 'string' ? body.packetId : undefined;
    const caseId = typeof body?.caseId === 'string' ? body.caseId : undefined;
    const receivedBy = typeof body?.receivedBy === 'string' ? body.receivedBy : 'hospital-console';
    const notes = typeof body?.notes === 'string' ? body.notes : undefined;

    let resolvedPacketId = packetId;

    if (!resolvedPacketId && caseId) {
      const packets = await readIntakePackets({ hospitalId, caseId, status: 'sent', limit: 1 });
      resolvedPacketId = packets[0]?.packetId;
    }

    if (!resolvedPacketId) {
      return NextResponse.json({ error: 'packetId or caseId with pending packet is required' }, { status: 400 });
    }

    const updated = await acknowledgeIntakePacket(resolvedPacketId, hospitalId, receivedBy, notes);
    if (!updated) {
      return NextResponse.json({ error: 'No matching pending packet found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await appendTimeline(
      updated.caseId,
      buildAuditEvent(now, {
        event: `Hospital intake packet acknowledged by ${updated.hospitalName ?? hospitalId}`,
        eventType: 'hospital_acknowledged',
        actorId: receivedBy,
        reason: `Packet ${updated.packetId} acknowledged`,
        nextHospitalId: updated.hospitalId,
        nextHospitalName: updated.hospitalName,
      }),
    );

    return NextResponse.json({
      success: true,
      packet: updated,
    });
  } catch (err: unknown) {
    console.error('[POST /api/hospital/[id]/receive-intake]', err);
    const message = err instanceof Error ? err.message : 'Failed to acknowledge intake packet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
