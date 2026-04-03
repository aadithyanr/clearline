import { VitalsPayload, SymptomsPayload, TriageResponse } from './types';

const VALID_SEVERITIES: Array<TriageResponse['severity']> = ['critical', 'urgent', 'non-urgent'];
const MAX_REASONING_LENGTH = 200;

const SYSTEM_PROMPT = `You are an emergency triage model for Pune. You are not a doctor.
Given vitals and symptoms, classify urgency as one of: critical | urgent | non-urgent.
Return ONLY valid JSON in this exact schema (no extra text):
{
  "severity": "critical" | "urgent" | "non-urgent",
  "reasoning": "short explanation (1-3 sentences)",
  "done": true,
  "symptoms": {
    "chestPain": true | false,
    "shortnessOfBreath": true | false,
    "fever": true | false,
    "dizziness": true | false,
    "freeText": "summary text"
  }
}
`;

export class GeminiTriageError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_JSON' | 'INVALID_SCHEMA' | 'API_ERROR'
  ) {
    super(message);
    this.name = 'GeminiTriageError';
  }
}

function extractJSONString(text: string): string {
  let out = text.trim();

  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(out);
  if (codeBlock) {
    return codeBlock[1].trim();
  }

  const firstBrace = out.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = firstBrace; i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      return out.slice(firstBrace, end + 1);
    }
  }

  return out;
}

export function safeParseTriageJSON(text: string): TriageResponse {
  const raw = extractJSONString(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GeminiTriageError('Invalid JSON in model response', 'INVALID_JSON');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GeminiTriageError('Response is not a JSON object', 'INVALID_SCHEMA');
  }

  const obj = parsed as Record<string, unknown>;
  const severity = obj.severity;
  const reasoning = obj.reasoning;

  if (typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity as TriageResponse['severity'])) {
    throw new GeminiTriageError(`Invalid severity: must be one of ${VALID_SEVERITIES.join(', ')}`, 'INVALID_SCHEMA');
  }

  if (typeof reasoning !== 'string') {
    throw new GeminiTriageError('reasoning must be a string', 'INVALID_SCHEMA');
  }

  const trimmedReasoning = reasoning.length > MAX_REASONING_LENGTH
    ? reasoning.slice(0, MAX_REASONING_LENGTH).trim()
    : reasoning;

  return {
    severity: severity as TriageResponse['severity'],
    reasoning: trimmedReasoning,
    done: true,
    symptoms: {
      chestPain: Boolean(obj.symptoms && (obj.symptoms as any).chestPain),
      shortnessOfBreath: Boolean(obj.symptoms && (obj.symptoms as any).shortnessOfBreath),
      fever: Boolean(obj.symptoms && (obj.symptoms as any).fever),
      dizziness: Boolean(obj.symptoms && (obj.symptoms as any).dizziness),
      freeText: typeof (obj.symptoms as any)?.freeText === 'string' ? (obj.symptoms as any).freeText : '',
    }
  };
}

async function generateGeminiText(apiKey: string, modelId: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 250 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new GeminiTriageError(`Gemini API error ${response.status}: ${errorText}`, 'API_ERROR');
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== 'string') {
    throw new GeminiTriageError('Gemini API returned empty response', 'API_ERROR');
  }

  return text;
}

export async function classifyTriage(
  vitals: VitalsPayload,
  symptoms: SymptomsPayload
): Promise<TriageResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiTriageError('GEMINI_API_KEY is not set', 'API_ERROR');
  }

  const modelId = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

  const prompt = `${SYSTEM_PROMPT}\n\nVitals: HR=${vitals.heartRate} RR=${vitals.respiratoryRate} Stress=${vitals.stressIndex}\nSymptoms: ${JSON.stringify(symptoms)}`;

  const text = await generateGeminiText(apiKey, modelId, prompt);
  return safeParseTriageJSON(text);
}
