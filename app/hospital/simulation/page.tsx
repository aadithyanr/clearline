'use client';

import { useState } from 'react';

type Scenario =
  | 'closure_reroute'
  | 'hospital_ack'
  | 'hospital_reject'
  | 'intake_packet'
  | 'police_traffic'
  | 'triage_escalation';

export default function HospitalSimulationPage() {
  const [scenario, setScenario] = useState<Scenario>('closure_reroute');
  const [caseId, setCaseId] = useState('');
  const [baselineEta, setBaselineEta] = useState(18);
  const [currentEta, setCurrentEta] = useState(32);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('Run a simulation scenario to generate demonstrable events.');

  async function runSimulation() {
    setLoading(true);
    try {
      const res = await fetch('/api/hospital/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          caseId: caseId.trim() || undefined,
          baselineEtaMinutes: baselineEta,
          currentEtaMinutes: currentEta,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Simulation failed');
      }

      setResult(JSON.stringify(payload, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simulation failed';
      setResult(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-black tracking-tight">Hospital Simulation Console</h1>
        <p className="text-sm text-slate-300 mt-1">
          Dummy simulation controls for demo: closure reroute, hospital ACK/reject, intake packets, and police traffic coordination.
        </p>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Scenario
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as Scenario)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="closure_reroute">closure_reroute</option>
                <option value="hospital_ack">hospital_ack</option>
                <option value="hospital_reject">hospital_reject</option>
                <option value="intake_packet">intake_packet</option>
                <option value="police_traffic">police_traffic</option>
                <option value="triage_escalation">triage_escalation</option>
              </select>
            </label>

            <label className="text-sm font-semibold">
              Optional caseId
              <input
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="CL-XXXXXX"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-semibold">
              Baseline ETA (min)
              <input
                type="number"
                min={1}
                value={baselineEta}
                onChange={(e) => setBaselineEta(Number(e.target.value || 0))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-semibold">
              Current ETA (min)
              <input
                type="number"
                min={1}
                value={currentEta}
                onChange={(e) => setCurrentEta(Number(e.target.value || 0))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="mt-4 rounded bg-amber-400 px-4 py-2 text-sm font-black uppercase tracking-wide text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Simulation'}
          </button>
        </div>

        <pre className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-xs text-emerald-200 overflow-auto">
{result}
        </pre>
      </div>
    </main>
  );
}
