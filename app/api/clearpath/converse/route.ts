import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  readConversationSession,
  upsertConversationSession,
} from '@/lib/clearpath/conversationSessionStore';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Clearline emergency triage assistant. Your purpose is to assess symptoms and guide users safely in natural language.

Guidelines:
- Sound human, supportive, and natural (not robotic/system-like).
- Be empathetic, calm, and concise (1-2 short sentences in most replies).
- Ask only the most relevant next question; avoid checklist-style interrogation.
- Identify red flags rapidly: chest pain, breathing distress, altered consciousness, severe bleeding, stroke signs.
- If the situation is clearly serious, move to routing guidance without unnecessary questions.
- Match the user's language naturally (English, Hinglish, Hindi, Marathi as detected from user text).
- If the user asks for general help/advice (not active emergency), provide direct assistance only and avoid forcing routing flow.
- For likely emergencies, act fast: decide in 1-2 turns whenever possible and prompt immediate location sharing.
- Avoid unnecessary text. Give only required response and next best action.
- Do NOT include markdown code fences.

INTENT_RESULT line (machine-readable, patient-hidden):
INTENT_RESULT:{"mode":"assist_only|triage_and_route","reason":"brief reason"}

TRIAGE_RESULT line (machine-readable, patient-hidden):
TRIAGE_RESULT:{"severity":"critical|urgent|non-urgent","confidenceScore":0.0-1.0,"reasoning":"brief conclusion","done":true,"symptoms":{"chestPain":true|false,"shortnessOfBreath":true|false,"fever":true|false,"dizziness":true|false,"freeText":"short phrase"}}

- Machine-readable lines must be single-line valid JSON.
- If uncertain for active incident, choose severity:"urgent".`;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface IntentResult {
  mode: 'assist_only' | 'triage_and_route';
  reason: string;
}

function normalizeConfidenceScore(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 0.65;
  return Math.max(0.05, Math.min(0.99, Number(raw.toFixed(2))));
}

async function generateGeminiText(apiKey: string, modelId: string, messages: Message[]) {
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidate || typeof candidate !== 'string') {
    throw new Error('Gemini API returned empty response');
  }

  return candidate;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, sessionId: incomingSessionId, channel } = body as {
      messages: Message[];
      sessionId?: string;
      channel?: 'web' | 'whatsapp';
    };

    const resolvedChannel: 'web' | 'whatsapp' = channel === 'whatsapp' ? 'whatsapp' : 'web';
    const sessionId = incomingSessionId || `CS-${nanoid(10).toUpperCase()}`;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const stored = await readConversationSession(sessionId, resolvedChannel);
    const incomingUserOnly = messages.length === 1 && messages[0]?.role === 'user';

    const mergedMessages: Message[] = incomingUserOnly && stored?.messages?.length
      ? [
          ...stored.messages.map((m) => ({ role: m.role, content: m.content } as Message)),
          ...messages,
        ]
      : messages;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const modelId = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

    const userMessageCount = mergedMessages.filter(m => m.role === 'user').length;

    // Hard cutoff kept low to prioritize action over prolonged chat.
    if (userMessageCount >= 4) {
      const conversationSummary = mergedMessages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('; ');

      const persistedHistory = [
        ...mergedMessages,
        { role: 'assistant', content: "Got it. We're routing you to the nearest ER now." } as Message,
      ].filter((m) => m.role === 'user' || m.role === 'assistant');

      await upsertConversationSession({
        sessionId,
        channel: resolvedChannel,
        messages: persistedHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      });

      return NextResponse.json({
        sessionId,
        reply: "Got it. We're routing you to the nearest ER now.",
        intent: {
          mode: 'triage_and_route' as const,
          reason: 'Conversation length threshold reached; fast action path activated.',
        },
        triage: {
          severity: 'urgent' as const,
          confidenceScore: 0.52,
          reasoning: `Auto-triaged after extended conversation: ${conversationSummary.slice(0, 200)}`,
          symptoms: { chestPain: false, shortnessOfBreath: false, fever: false, dizziness: false, freeText: conversationSummary.slice(0, 300) },
        },
      });
    }

    const fullMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...mergedMessages,
    ];

    // Encourage early action-oriented decisions.
    if (userMessageCount >= 1) {
      fullMessages.push({
        role: 'system',
        content: 'If emergency likelihood is meaningful, finalize triage now with TRIAGE_RESULT and guide immediate location sharing for routing. If it is a general assistance request only, emit INTENT_RESULT as assist_only and do not force triage.',
      });
    }

    const text = await generateGeminiText(apiKey, modelId, fullMessages);

    // Extract INTENT_RESULT JSON
    let intent: IntentResult = {
      mode: 'triage_and_route',
      reason: 'Default emergency triage mode.',
    };

    const intentMatch = /INTENT_RESULT:\s*(\{[^\n]*\})/m.exec(text);
    if (intentMatch) {
      try {
        const parsedIntent = JSON.parse(intentMatch[1].trim());
        if (parsedIntent?.mode === 'assist_only' || parsedIntent?.mode === 'triage_and_route') {
          intent = {
            mode: parsedIntent.mode,
            reason: String(parsedIntent?.reason || 'Intent parsed from user request.'),
          };
        }
      } catch {
        // ignore invalid intent JSON
      }
    }

    // Extract triage JSON from the response — greedy match to handle nested braces
    let triage = null;

    // TRIAGE_RESULT: format — grab everything from the opening { to the end of the string
    const triageMatch = /TRIAGE_RESULT:\s*(\{[\s\S]*\})\s*$/.exec(text);
    if (triageMatch) {
      try {
        const parsed = JSON.parse(triageMatch[1].trim());
        if (parsed.done && parsed.severity && parsed.reasoning) {
          triage = {
            severity: parsed.severity,
            confidenceScore: normalizeConfidenceScore(parsed.confidenceScore),
            reasoning: parsed.reasoning,
            symptoms: parsed.symptoms || null,
          };
        }
      } catch {
        // Not valid JSON, ignore
      }
    }

    // Legacy ```json format fallback
    if (!triage) {
      const jsonMatch = /```json\s*([\s\S]*?)```/.exec(text);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          if (parsed.done && parsed.severity && parsed.reasoning) {
            triage = {
              severity: parsed.severity,
              confidenceScore: normalizeConfidenceScore(parsed.confidenceScore),
              reasoning: parsed.reasoning,
              symptoms: parsed.symptoms || null,
            };
          }
        } catch {
          // Not valid JSON, ignore
        }
      }
    }

    if (intent.mode === 'assist_only') {
      triage = null;
    }

    // Clean the display text — strip all machine-readable data so only natural speech remains
    const displayText = text
      .replace(/INTENT_RESULT:\s*\{[^\n]*\}\s*$/gm, '')
      .replace(/TRIAGE_RESULT:\s*\{[\s\S]*\}\s*$/g, '')     // TRIAGE_RESULT line (greedy)
      .replace(/```json[\s\S]*?```/g, '')                     // ```json blocks
      .replace(/\{[^}]*"severity"\s*:[\s\S]*\}/g, '')         // any raw JSON with "severity"
      .replace(/\{[^}]*"done"\s*:\s*true[\s\S]*\}/g, '')      // any raw JSON with "done": true
      .trim();

    const assistantReply = displayText || 'Please share a little more detail so I can guide you safely.';
    const persistedHistory = [
      ...mergedMessages,
      { role: 'assistant', content: assistantReply } as Message,
    ].filter((m) => m.role === 'user' || m.role === 'assistant');

    await upsertConversationSession({
      sessionId,
      channel: resolvedChannel,
      messages: persistedHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    return NextResponse.json({
      sessionId,
      reply: assistantReply,
      intent,
      triage,
    });
  } catch (err) {
    console.error('Converse API error:', err);
    return NextResponse.json(
      { error: 'Conversation failed. Please try again.' },
      { status: 500 }
    );
  }
}
