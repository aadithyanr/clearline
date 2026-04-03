// Single-shot triage: symptom free-text → severity + predicted care needs
// Used by the WhatsApp bot and the public case page

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 20;

const SYSTEM_PROMPT = `You are an emergency medical triage AI. A patient or bystander has sent a single message describing their emergency.

Your job is to output ONLY a JSON object (no markdown, no explanation) with these fields:
{
  "severity": "critical" | "urgent" | "non-urgent",
  "predictedNeeds": string[],  // e.g. ["ICU", "ventilator", "cardiac", "neurosurgeon", "trauma", "general"]
  "reasoning": string,          // one sentence explaining the triage decision
  "suggestedAction": string     // one sentence for the patient e.g. "We are routing an ambulance to the nearest cardiac centre."
}

Severity rules:
- critical: life-threatening, immediate risk of death (chest pain, stroke signs, unconscious, severe bleeding, not breathing)
- urgent: serious but stable (high fever, fracture, moderate pain, vomiting blood)
- non-urgent: minor (mild pain, slow-onset, no red flags)

predictedNeeds options (pick all that apply):
ICU, ventilator, cardiac, neurosurgeon, trauma, burns, paediatrics, obstetrics, ophthalmology, dialysis, general

Output ONLY the JSON. No code fences.`;

export async function POST(req: NextRequest) {
  try {
    const { message, city } = await req.json() as { message: string; city?: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

    const modelId = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const userText = city
      ? `City: ${city}\nEmergency message: ${message}`
      : `Emergency message: ${message}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: '{"severity":' }] }, // prime JSON output
          { role: 'user', parts: [{ text: userText }] },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    let raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip code fences if model ignores instructions
    raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    // Gemini was primed with the partial JSON — re-prepend if needed
    if (!raw.startsWith('{')) raw = '{"severity":' + raw;

    const parsed = JSON.parse(raw);

    return NextResponse.json({
      severity: parsed.severity ?? 'urgent',
      predictedNeeds: parsed.predictedNeeds ?? ['general'],
      reasoning: parsed.reasoning ?? '',
      suggestedAction: parsed.suggestedAction ?? 'Routing you to the nearest emergency room.',
    });
  } catch (err: any) {
    console.error('[triage]', err);
    // Safe fallback so the WhatsApp bot never crashes
    return NextResponse.json({
      severity: 'urgent',
      predictedNeeds: ['general'],
      reasoning: 'Auto-triaged due to processing error.',
      suggestedAction: 'Routing you to the nearest emergency room.',
    });
  }
}
