'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';

const CaseMap = dynamic(() => import('./CaseMap'), { ssr: false });

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'bg-red-500', label: 'CRITICAL', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-red-500/20' },
  urgent:   { color: '#f97316', bg: 'bg-orange-500', label: 'URGENT',   text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' },
  'non-urgent': { color: '#22c55e', bg: 'bg-green-500', label: 'NON-URGENT', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-green-500/20' },
};

export default function CasePageContent({ caseId, initialData, initialError }: { caseId: string; initialData: EmergencyCase | null; initialError: string | null }) {
  const [caseData, setCaseData] = useState<EmergencyCase | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState<boolean>(!initialData && !initialError);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initialData) return;

    let cancelled = false;

    async function loadCase() {
      setLoading(true);
      try {
        const res = await fetch(`/api/cases?id=${encodeURIComponent(caseId)}`, { cache: 'no-store' });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error || 'Case not found. It may have expired or the ID is incorrect.');
        }

        if (!cancelled) {
          setCaseData(payload as EmergencyCase);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCaseData(null);
          setError(err instanceof Error ? err.message : 'Failed to load case.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCase();
    return () => {
      cancelled = true;
    };
  }, [caseId, initialData]);

  useEffect(() => {
    if (caseData && caseData.createdAt) {
      const created = new Date(caseData.createdAt).getTime();
      setElapsed(Math.floor((Date.now() - created) / 1000));
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - created) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [caseData]);

  if (error) return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl mb-2">✕</div>
      <h1 className="text-white font-bold text-xl">Case Not Found</h1>
      <p className="text-slate-400 text-sm max-w-xs">{error}</p>
    </div>
  );

  if (loading || !caseData) return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-xs font-bold tracking-widest uppercase">Loading {caseId}...</p>
      </div>
    </div>
  );

  const normalizedSev = caseData.triage?.severity?.toLowerCase() || 'urgent';
  const sev = SEVERITY_CONFIG[normalizedSev as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG['urgent'];
  const hosp = caseData.assignedHospital?.hospital;
  const rec = caseData.assignedHospital;
  const eta = rec?.drivingTimeMinutes ?? 0;
  const etaRemaining = Math.max(0, eta - Math.floor(elapsed / 60));

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden">

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <CaseMap caseData={caseData} />
      </div>

      {/* Top pill — Case ID + severity */}
      <div className="relative z-10 pt-safe-top pt-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-xl">
          <div className={`w-2 h-2 rounded-full ${sev.bg} ${caseData.status === 'en_route' ? 'animate-pulse' : ''}`} />
          <span className="text-white text-xs font-bold tracking-wider">{caseId}</span>
        </div>
        <div className={`flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-xl border ${sev.border} rounded-full px-3 py-1.5 shadow-xl`}>
          <span className={`text-xs font-black tracking-widest ${sev.text}`}>{sev.label}</span>
        </div>
      </div>

      {/* Bottom card — Hospital + ETA */}
      <div className="relative z-10 mt-auto mx-3 mb-4">
        <div className="bg-slate-950/92 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

          {/* ETA bar */}
          <div className={`h-1 w-full bg-gradient-to-r from-${sev.bg.replace('bg-', '')} to-transparent`}
               style={{ background: `linear-gradient(90deg, ${sev.color}, transparent)` }} />

          <div className="p-5">

            {/* Ambulance status */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2.5 h-2.5 rounded-full ${sev.bg} animate-pulse`} />
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">
                {caseData.status === 'en_route' ? 'Ambulance En Route' : caseData.status === 'arrived' ? 'Arrived' : 'Routing...'}
              </span>
              <span className="ml-auto text-xs text-white/30">{formatElapsed(elapsed)} ago</span>
            </div>

            {/* Hospital name */}
            <h1 className="text-white font-black text-xl leading-tight mb-1">
              {hosp?.name ?? '—'}
            </h1>
            <p className="text-white/40 text-xs mb-4">{hosp?.city ? hosp.city.charAt(0).toUpperCase() + hosp.city.slice(1) : ''}</p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatCard label="ETA" value={`~${etaRemaining} min`} accent={sev.color} />
              <StatCard label="Drive" value={`${eta} min`} />
              <StatCard label="Wait" value={`~${rec?.adjustedWaitMinutes ?? '?'} min`} />
            </div>

            {/* Triage reasoning */}
            <div className={`bg-white/5 border ${sev.border} rounded-2xl p-3 mb-4`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${sev.text}`}>Why this hospital</p>
              <p className="text-white/70 text-xs leading-relaxed">{rec?.reason || caseData.triage.reasoning}</p>
            </div>

            {/* Predicted needs */}
            {(caseData.triage.predictedNeeds?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {caseData.triage.predictedNeeds.map((need: string) => (
                  <span key={need} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/50">
                    {need}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Call 112 button for critical */}
          {caseData.triage.severity === 'critical' && (
            <a href="tel:112" className="block text-center py-3.5 bg-red-500 text-white font-black text-sm tracking-wider hover:bg-red-600 transition-colors">
              📞 CALL 112 NOW
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-white font-black text-sm" style={accent ? { color: accent } : {}}>{value}</p>
    </div>
  );
}
