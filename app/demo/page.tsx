'use client';

import { useState } from 'react';
import useSWR from 'swr';

type SimulationScenario =
  | 'external_incident'
  | 'obstacle_reroute'
  | 'icu_unavailable'
  | 'police_traffic';

type DispatchCase = {
  caseId: string;
  status: string;
  triage?: { severity?: string };
  assignedHospital?: { hospital?: { name?: string } };
};

type RunResult = {
  ok: boolean;
  scenario: SimulationScenario;
  summary: string;
  payload: unknown;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ACTIONS: Array<{ id: SimulationScenario; title: string }> = [
  { id: 'external_incident', title: 'Road Closure' },
  { id: 'obstacle_reroute', title: 'Obstacle + Reroute' },
  { id: 'icu_unavailable', title: 'ICU Unavailable' },
  { id: 'police_traffic', title: 'Police/Traffic Alert' },
];

function summarize(payload: unknown, scenario: SimulationScenario): string {
  if (!payload || typeof payload !== 'object') return `${scenario} executed.`;
  const p = payload as Record<string, unknown>;
  if (p.error) return String(p.error);
  if (p.rerouted) return `Rerouted to ${String(p.rerouteHospitalName || 'fallback hospital')}.`;
  if (p.triggered) return `Coordination triggered via ${String(p.channel || 'traffic')}.`;
  if (p.reason) return String(p.reason);
  return `${scenario} completed.`;
}

export default function DemoPage() {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [running, setRunning] = useState<SimulationScenario | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const { data, mutate } = useSWR('/api/dispatch/cases', fetcher, { refreshInterval: 7000 });
  const cases: DispatchCase[] = data?.cases ?? [];

  async function runAction(scenario: SimulationScenario) {
    setRunning(scenario);
    try {
      const res = await fetch('/api/hospital/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          caseId: selectedCaseId || undefined,
          baselineEtaMinutes: 20,
          currentEtaMinutes: 36,
          confidenceScore: 0.42,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      setResult({
        ok: res.ok,
        scenario,
        summary: summarize(payload, scenario),
        payload,
      });
      await mutate();
    } catch (err: unknown) {
      setResult({
        ok: false,
        scenario,
        summary: err instanceof Error ? err.message : 'Unknown error',
        payload: { error: err instanceof Error ? err.message : 'Unknown error' },
      });
    } finally {
      setRunning(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h1 className="text-xl font-bold">Simple Demo</h1>
          <p className="mt-1 text-sm text-slate-300">Pick a case, then press one action button.</p>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Live Cases</h2>
            <button
              onClick={() => mutate()}
              className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-2">
            {cases.length === 0 && <p className="text-sm text-slate-400">No live cases available.</p>}
            {cases.map((c) => (
              <button
                key={c.caseId}
                onClick={() => setSelectedCaseId(c.caseId)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  selectedCaseId === c.caseId
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-950'
                }`}
              >
                <p className="text-sm font-semibold">{c.caseId}</p>
                <p className="text-xs text-slate-300">
                  {c.triage?.severity || 'unknown'} · {c.status} · {c.assignedHospital?.hospital?.name || 'hospital pending'}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Actions</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => runAction(a.id)}
                disabled={Boolean(running)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium hover:border-emerald-400 disabled:opacity-60"
              >
                {running === a.id ? `Running ${a.title}...` : a.title}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Latest Result</h2>
          {!result ? (
            <p className="mt-2 text-sm text-slate-400">Run any action to see output.</p>
          ) : (
            <>
              <p className={`mt-2 text-sm font-semibold ${result.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.ok ? 'Success' : 'Failed'} · {result.scenario}
              </p>
              <p className="mt-1 text-sm text-amber-200">{result.summary}</p>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-200">
{JSON.stringify(result.payload, null, 2)}
              </pre>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
