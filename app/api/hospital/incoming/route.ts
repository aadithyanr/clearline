import { NextRequest, NextResponse } from 'next/server';
import { readLiveCases } from '@/lib/clearpath/caseStore';
import { readIntakePackets } from '@/lib/clearpath/intakePacketStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const hospitalId = req.nextUrl.searchParams.get('hospitalId') || undefined;
    const ackStatus = req.nextUrl.searchParams.get('ackStatus') || undefined;

    const liveCases = await readLiveCases();

    const filtered = liveCases
      .filter((c) => {
        const assignedHospitalId = c.assignedHospital?.hospital?.id;
        if (hospitalId && assignedHospitalId !== hospitalId) return false;
        if (ackStatus && c.hospitalAck?.status !== ackStatus) return false;
        return true;
      })
      .map((c) => ({
        caseId: c.caseId,
        severity: c.triage?.severity,
        status: c.status,
        hospitalAckStatus: c.hospitalAck?.status ?? 'pending',
        hospitalName: c.assignedHospital?.hospital?.name ?? 'Unknown Hospital',
        hospitalId: c.assignedHospital?.hospital?.id,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      }))
      .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));

    const counts = {
      total: filtered.length,
      pending: filtered.filter((c) => c.hospitalAckStatus === 'pending').length,
      acknowledged: filtered.filter((c) => c.hospitalAckStatus === 'acknowledged').length,
      rejected: filtered.filter((c) => c.hospitalAckStatus === 'rejected').length,
    };

    const packets = await readIntakePackets({ hospitalId, limit: 25 });
    const packetCounts = {
      total: packets.length,
      sent: packets.filter((p) => p.status === 'sent').length,
      received: packets.filter((p) => p.status === 'received').length,
    };

    return NextResponse.json({
      counts,
      cases: filtered,
      packets,
      packetCounts,
      generatedAt: Date.now(),
    });
  } catch (err: unknown) {
    console.error('[GET /api/hospital/incoming]', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch incoming hospital feed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
