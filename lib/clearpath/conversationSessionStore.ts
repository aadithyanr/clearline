import { nanoid } from 'nanoid';
import { getDb } from './mongoClient';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

export interface ConversationSession {
  sessionId: string;
  channel: 'web' | 'whatsapp';
  messages: ConversationMessage[];
  updatedAt: string;
  createdAt: string;
}

async function getCollection() {
  const db = await getDb();
  return db.collection<ConversationSession>('conversationSessions');
}

export async function readConversationSession(
  sessionId: string,
  channel: 'web' | 'whatsapp',
): Promise<ConversationSession | null> {
  const col = await getCollection();
  const doc = await col.findOne({ sessionId, channel }, { projection: { _id: 0 } });
  return doc ?? null;
}

export async function upsertConversationSession(input: {
  sessionId?: string;
  channel: 'web' | 'whatsapp';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<ConversationSession> {
  const sessionId = input.sessionId || `CS-${nanoid(10).toUpperCase()}`;
  const now = new Date().toISOString();

  const messages: ConversationMessage[] = input.messages
    .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 1200), ts: now }))
    .slice(-20);

  const col = await getCollection();
  await col.updateOne(
    { sessionId, channel: input.channel },
    {
      $setOnInsert: {
        sessionId,
        channel: input.channel,
        createdAt: now,
      },
      $set: {
        messages,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return {
    sessionId,
    channel: input.channel,
    messages,
    updatedAt: now,
    createdAt: now,
  };
}
