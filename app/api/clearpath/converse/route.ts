import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Clearline emergency triage assistant for Pune. Your purpose is to assess user symptoms and provide a safe triage classification.

Guidelines:
- Ask focused questions, 1-2 sentences each. Keep conversational tone professional and concise.
- Identify red flags rapidly: chest pain, respiratory distress, altered consciousness, bleeding, stroke signs.
- Once enough info is collected (or after 3 user messages), finalize with: "Got it. We're routing you to the nearest ER now." and add one final line.
- Do NOT include markdown code fences.

TRIAGE_RESULT line (machine-readable, patient-hidden):
TRIAGE_RESULT:{"severity":"critical|urgent|non-urgent","reasoning":"brief conclusion","done":true,"symptoms":{"chestPain":true|false,"shortnessOfBreath":true|false,"fever":true|false,"dizziness":true|false,"freeText":"short phrase"}}

- JSON must be valid. No extra text after the line. If uncertain, choose severity:"urgent".`;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
    const { messages } = body as { messages: Message[] };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const modelId = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

    const userMessageCount = messages.filter(m => m.role === 'user').length;

    // Hard cutoff: if 5+ user messages, force triage from conversation history
    if (userMessageCount >= 5) {
      const conversationSummary = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('; ');
      return NextResponse.json({
        reply: "Got it. We're routing you to the nearest ER now.",
        triage: {
          severity: 'urgent' as const,
          reasoning: `Auto-triaged after extended conversation: ${conversationSummary.slice(0, 200)}`,
          symptoms: { chestPain: false, shortnessOfBreath: false, fever: false, dizziness: false, freeText: conversationSummary.slice(0, 300) },
        },
      });
    }

    const fullMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // After 3 user messages, inject a hard nudge to force triage NOW
    if (userMessageCount >= 3) {
      fullMessages.push({
        role: 'system',
        content: 'You have enough information. You MUST triage NOW. Say "Got it. We\'re routing you to the nearest ER now." and include the TRIAGE_RESULT line. Do NOT ask any more questions.',
      });
    }

    const text = await generateGeminiText(apiKey, modelId, fullMessages);

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
              reasoning: parsed.reasoning,
              symptoms: parsed.symptoms || null,
            };
          }
        } catch {
          // Not valid JSON, ignore
        }
      }
    }

    // Clean the display text — strip all machine-readable data so only natural speech remains
    let displayText = text
      .replace(/TRIAGE_RESULT:\s*\{[\s\S]*\}\s*$/g, '')     // TRIAGE_RESULT line (greedy)
      .replace(/```json[\s\S]*?```/g, '')                     // ```json blocks
      .replace(/\{[^}]*"severity"\s*:[\s\S]*\}/g, '')         // any raw JSON with "severity"
      .replace(/\{[^}]*"done"\s*:\s*true[\s\S]*\}/g, '')      // any raw JSON with "done": true
      .trim();

    return NextResponse.json({
      reply: displayText,
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
