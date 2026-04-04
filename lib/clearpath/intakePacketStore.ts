import { nanoid } from 'nanoid';
import { getDb } from './mongoClient';

export type IntakePacketStatus = 'sent' | 'received';

export interface IntakePacket {
  packetId: string;
  caseId: string;
  hospitalId: string;
  hospitalName?: string;
  payload: {
    severity?: string;
    predictedNeeds?: string[];
    patientMessage?: string;
    etaMinutes?: number;
    location?: { lat: number; lng: number };
  };
  status: IntakePacketStatus;
  sentAt: string;
  receivedAt?: string;
  receivedBy?: string;
  notes?: string;
}

async function getCollection() {
  const db = await getDb();
  return db.collection<IntakePacket>('intakePackets');
}

export async function createIntakePacket(input: {
  caseId: string;
  hospitalId: string;
  hospitalName?: string;
  payload: IntakePacket['payload'];
}): Promise<IntakePacket> {
  const now = new Date().toISOString();
  const packet: IntakePacket = {
    packetId: `PKT-${nanoid(8).toUpperCase()}`,
    caseId: input.caseId,
    hospitalId: input.hospitalId,
    hospitalName: input.hospitalName,
    payload: input.payload,
    status: 'sent',
    sentAt: now,
  };

  const col = await getCollection();
  await col.insertOne(packet);
  return packet;
}

export async function acknowledgeIntakePacket(
  packetId: string,
  hospitalId: string,
  receivedBy?: string,
  notes?: string,
): Promise<IntakePacket | null> {
  const now = new Date().toISOString();
  const col = await getCollection();

  const result = await col.findOneAndUpdate(
    { packetId, hospitalId, status: 'sent' },
    {
      $set: {
        status: 'received',
        receivedAt: now,
        receivedBy,
        notes,
      },
    },
    {
      returnDocument: 'after',
      projection: { _id: 0 },
    },
  );

  return result ?? null;
}

export async function readIntakePackets(filter: {
  hospitalId?: string;
  caseId?: string;
  status?: IntakePacketStatus;
  limit?: number;
}): Promise<IntakePacket[]> {
  const query: Record<string, unknown> = {};
  if (filter.hospitalId) query.hospitalId = filter.hospitalId;
  if (filter.caseId) query.caseId = filter.caseId;
  if (filter.status) query.status = filter.status;

  const col = await getCollection();
  const docs = await col
    .find(query, { projection: { _id: 0 } })
    .sort({ sentAt: -1 })
    .limit(filter.limit ?? 30)
    .toArray();

  return docs;
}
