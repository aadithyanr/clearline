'use client';

import { useState } from 'react';

type Scenario = 'road_closure' | 'icu_unavailable' | 'mass_casualty' | 'police_traffic';

interface ScenarioPanelProps {
  selectedCaseId?: string | null;
  onMutate: () => void;
}

const SCENARIOS: Array<{ id: Scenario; emoji: string; label: string; description: string }> = [
  {
    id: 'road_closure',
    emoji: '🚧',
    label: 'Road Closure',
    description: 'Simulate a highway blockage mid-route',
  },
  {
    id: 'icu_unavailable',
    emoji: '🏥',
    label: 'ICU Unavailable',
    description: 'Force reroute to next hospital with ICU',
  },
  {
    id: 'mass_casualty',
    emoji: '🚨',
    label: 'Mass Casualty',
    description: 'Dispatch 4 simultaneous crash victims',
  },
  {
    id: 'police_traffic',
    emoji: '🚓',
    label: 'Police/Traffic Alert',
    description: 'Trigger city coordination for blocked roads',
  },
];

export default function ScenarioPanel({ selectedCaseId, onMutate }: ScenarioPanelProps) {
  const [running, setRunning] = useState<Scenario | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function runScenario(id: Scenario) {
    setRunning(id);
    setResult(null);

    try {
      if (id === 'mass_casualty') {
        const res = await fetch('/api/dispatch/cases/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cases: [
              { message: 'Multi-vehicle pileup. Severe head trauma, unconscious.', userLat: 18.5028, userLng: 73.8116 },
              { message: 'Car crushed, driver has major burns and cannot breathe.', userLat: 18.5034, userLng: 73.8121 },
              { message: 'Pedestrian hit, massive leg bleeding, losing consciousness.', userLat: 18.5022, userLng: 73.8111 },
              { message: 'Chest pain and struggling to breathe at crash site.', userLat: 18.5038, userLng: 73.8130 },
            ],
            massCasualtyMode: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        setResult({
          ok: res.ok,
          message: res.ok
            ? `4 cases created — distributed across ${new Set(data.cases?.map((c: any) => c.assignedHospital?.hospital?.name)).size ?? '?'} hospitals`
            : 'Failed to create MCI batch',
        });
        onMutate();
        return;
      }

      // Road closure & ICU unavailable both use the monitor ping on selected case
      if (!selectedCaseId) {
        setResult({ ok: false, message: 'Select a case first to run this scenario' });
        return;
      }

      if (id === 'road_closure') {
        const res = await fetch(`/api/dispatch/cases/${selectedCaseId}/monitor/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baselineEtaMinutes: 15,
            currentEtaMinutes: 38,
            roadClosureReported: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        setResult({
          ok: res.ok,
          message: data.rerouted
            ? `Rerouted → ${data.rerouteHospitalName ?? 'fallback hospital'}`
            : data.reason ?? 'Road closure logged, monitoring active',
        });
        if (data.rerouted) onMutate();
        return;
      }

      if (id === 'icu_unavailable') {
        // Override to the first alternative using the override endpoint
        const caseRes = await fetch(`/api/dispatch/cases?id=${selectedCaseId}`);
        const caseData = await caseRes.json().catch(() => null);
        const alternatives = caseData?.alternatives ?? [];
        let fallback = alternatives[0];
        if (!fallback) {
          fallback = {
            hospital: { id: 'demo-icu-annex', name: 'City Central ICU Annex' },
            totalEstimatedMinutes: 18,
            drivingTimeMinutes: 15,
            waitMinutes: 3,
            reason: 'Fallback generated for ICU unavailability simulation',
          };
        }
        const res = await fetch(`/api/dispatch/cases/${selectedCaseId}/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newHospital: fallback, reason: 'ICU unavailable at primary hospital' }),
        });
        setResult({
          ok: res.ok,
          message: res.ok
            ? `Rerouted → ${fallback.hospital?.name} (ICU available)`
            : 'Override failed',
        });
        if (res.ok) onMutate();
        return;
      }

      if (id === 'police_traffic') {
        const res = await fetch('/api/hospital/simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: 'police_traffic',
            caseId: selectedCaseId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        setResult({
          ok: res.ok,
          message: res.ok && data.triggered
            ? `Triggered coordination via ${data.channel?.replaceAll('_', ' ')}`
            : data.reason || 'Failed to trigger coordination',
        });
        return;
      }
    } catch (err) {
      setResult({ ok: false, message: 'Request failed — check console' });
      console.error(err);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="w-full flex-shrink-0">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden pointer-events-auto">

            {/* Panel header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">Incident Scenarios</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedCaseId ? `Acting on ${selectedCaseId}` : 'Select a case for case-specific scenarios'}
              </p>
            </div>

            {/* Scenario buttons */}
            <div className="p-3 flex flex-col gap-2">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => runScenario(s.id)}
                  disabled={!!running}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-xl text-left
                    border transition-all
                    ${running === s.id
                      ? 'bg-slate-50 border-slate-200 opacity-70'
                      : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 active:scale-98 shadow-sm'
                    }
                    disabled:cursor-wait
                  `}
                >
                  <span className="text-xl mt-0.5 shrink-0">{s.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {running === s.id ? 'Running...' : s.label}
                    </p>
                    <p className="text-[0.7rem] text-slate-500 mt-0.5">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Result feedback */}
            {result && (
              <div className={`mx-3 mb-3 px-3 py-2 rounded-lg border text-[0.75rem] font-semibold ${
                result.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {result.ok ? '✓ ' : '✕ '}{result.message}
              </div>
            )}
      </div>
    </div>
  );
}
