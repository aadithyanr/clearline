'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScoredHospital } from '@/lib/clearpath/types';

interface RoutingResultProps {
  severity: 'critical' | 'urgent' | 'non-urgent';
  reasoning: string;
  recommended: ScoredHospital;
  alternatives: ScoredHospital[];
  onBack: () => void;
  onShowRoute?: (scored: ScoredHospital) => void;
  activeRouteId?: string | null;
}

const severityConfig = {
  critical: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100', label: 'CRITICAL' },
  urgent: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100', label: 'URGENT' },
  'non-urgent': { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', label: 'NON-URGENT' },
};

function HospitalCard({ scored, rank, onShowRoute, isRouteActive }: { scored: ScoredHospital; rank: number; onShowRoute?: (scored: ScoredHospital) => void; isRouteActive?: boolean }) {
  const h = scored.hospital;
  const isTop = rank === 1;

  return (
    <motion.div
      className={`bg-white border rounded-2xl p-4 transition-all ${isTop ? 'border-blue-200 shadow-md shadow-blue-500/5' : 'border-slate-100 shadow-sm'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.08 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {isTop && <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-wider mb-2">Best Match</span>}
          <p className={`font-bold truncate ${isTop ? 'text-base text-slate-900' : 'text-sm text-slate-800'}`}>
            {h.name}
          </p>
        </div>
        {scored.specialtyMatch && <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[9px] font-bold uppercase tracking-wider">Specialty</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: 'Drive', value: `${scored.drivingTimeMinutes}m`, bg: 'bg-blue-50/50', color: 'text-blue-700' },
          { label: 'Wait', value: `${scored.adjustedWaitMinutes}m`, bg: 'bg-amber-50/50', color: 'text-amber-700' },
          { label: 'Total', value: `${scored.totalEstimatedMinutes}m`, bg: 'bg-emerald-50/50', color: 'text-emerald-700' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-2 border border-slate-50 text-center`}>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <p className={`font-black mt-0.5 ${stat.color} ${isTop ? 'text-lg' : 'text-base'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 mt-3">
        <span>{scored.distanceKm} km away</span>
        <span className="text-slate-200">•</span>
        <span>{scored.occupancyPct}% full</span>
      </div>

      <p className="text-xs font-medium text-slate-500 leading-relaxed mt-2">{scored.reason}</p>

      {h.phone && (
        <motion.a
          href={`tel:${h.phone}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call {h.phone}
        </motion.a>
      )}

      {onShowRoute && !isRouteActive && (
        <motion.button
          onClick={() => onShowRoute(scored)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2 bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
          whileTap={{ scale: 0.98 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Show on Map
        </motion.button>
      )}

      {isRouteActive && (
        <div className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2 bg-blue-600 text-white shadow-md shadow-blue-600/20 rounded-xl text-xs font-bold">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          Viewing Route
        </div>
      )}
    </motion.div>
  );
}

export default function RoutingResult({ severity, reasoning, recommended, alternatives, onBack, onShowRoute, activeRouteId }: RoutingResultProps) {
  const [showAlts, setShowAlts] = useState(false);
  const config = severityConfig[severity];

  return (
    <div className="space-y-4">
      {/* Severity badge */}
      <motion.div
        className={`${config.bg} rounded-2xl p-5 text-center ring-1 ${config.ring}`}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <p className={`text-[10px] font-bold ${config.text} uppercase tracking-[0.2em] opacity-80`}>Triage Classification</p>
        <p className={`text-2xl font-black ${config.text} uppercase tracking-tight mt-1`}>{config.label}</p>
      </motion.div>

      {/* Reasoning */}
      <motion.div
        className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          AI Assessment
        </p>
        <p className="text-xs font-medium text-slate-600 leading-relaxed">{reasoning}</p>
      </motion.div>

      {/* Recommended */}
      <HospitalCard scored={recommended} rank={1} onShowRoute={onShowRoute} isRouteActive={(recommended.hospital?.id ?? (recommended.hospital as any)?._id) === activeRouteId} />

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="pt-2">
          <motion.button
            onClick={() => setShowAlts(!showAlts)}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            {showAlts ? 'Hide' : 'View'} {alternatives.length} Alternative{alternatives.length > 1 ? 's' : ''}
            <motion.svg
              className="w-3.5 h-3.5"
              animate={{ rotate: showAlts ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </motion.button>

          <AnimatePresence>
            {showAlts && (
              <motion.div
                className="space-y-3 mt-3 origin-top"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                {alternatives.map((alt, i) => (
                  <HospitalCard key={alt.hospital.id || i} scored={alt} rank={i + 2} onShowRoute={onShowRoute} isRouteActive={(alt.hospital?.id ?? (alt.hospital as any)?._id) === activeRouteId} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* India Emergency Ambulance (102) */}
      {severity === 'critical' && (
        <motion.a
          href="tel:102"
          className="flex items-center justify-center gap-2 w-full py-3.5 mt-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-black uppercase tracking-wide shadow-lg shadow-red-600/20 transition-all"
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call 102 Ambulance Now
        </motion.a>
      )}

      {/* Start over */}
      <motion.button
        onClick={onBack}
        className="w-full py-3.5 mt-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
        whileTap={{ scale: 0.98 }}
      >
        Start Over
      </motion.button>
    </div>
  );
}
