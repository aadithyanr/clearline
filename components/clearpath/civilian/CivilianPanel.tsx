'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceTriage from './VoiceTriage';
import RoutingResult from './RoutingResult';
import type { TriageResponse, RouteResponse, ScoredHospital } from '@/lib/clearpath/types';

const API_TIMEOUT_MS = 15_000;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -30 : 30, opacity: 0 }),
};

interface CivilianPanelProps {
  cityId: string;
  onRecommendation: (result: RouteResponse | null, routeParams?: Record<string, unknown>) => void;
  currentRecommendation?: RouteResponse & { activeRoute?: ScoredHospital } | null;
}

type Step = 'location' | 'conversation' | 'loading' | 'result';
const STEP_ORDER: Step[] = ['location', 'conversation', 'loading', 'result'];

function stepIndex(s: Step) { return STEP_ORDER.indexOf(s); }

export default function CivilianPanel({ cityId, onRecommendation, currentRecommendation }: CivilianPanelProps) {
  const [step, setStep] = useState<Step>('location');
  const [direction, setDirection] = useState(1);
  const [postalCode, setPostalCode] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goTo = useCallback((next: Step) => {
    setDirection(stepIndex(next) >= stepIndex(step) ? 1 : -1);
    setStep(next);
  }, [step]);

  useEffect(() => {
    if (currentRecommendation && currentRecommendation !== routeResult) {
      setRouteResult(currentRecommendation);
      const activeRoute = currentRecommendation.activeRoute;
      if (activeRoute) {
        const h = activeRoute.hospital as { id?: string; _id?: string } | undefined;
        setActiveRouteId(h?.id ?? h?._id ?? null);
      } else {
        const rec = currentRecommendation.recommended as ScoredHospital | undefined;
        const h = rec?.hospital as { id?: string; _id?: string } | undefined;
        setActiveRouteId(h?.id ?? h?._id ?? null);
      }
    }
  }, [currentRecommendation, routeResult]);

  const handleUseMyLocation = useCallback(() => {
    setLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Location is not supported on this device.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        (async () => {
          try {
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!token) return;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?country=ca,in&limit=1&access_token=${token}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = (await res.json()) as { features?: Array<{ text?: string; properties?: { postalcode?: string }; place_name?: string }> };
            const feature = data.features?.[0];
            const code = feature?.text || feature?.properties?.postalcode || (typeof feature?.place_name === 'string' ? feature.place_name.split(',')[0] : undefined);
            if (code) setPostalCode(code as string);
          } catch (err) { console.error('Reverse geocoding failed', err); }
          finally { setLocating(false); }
        })();
      },
      () => { setError('Could not get your location.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleTriageComplete = useCallback(
    async (triage: { severity: 'critical' | 'urgent' | 'non-urgent'; reasoning: string; symptoms: { chestPain: boolean; shortnessOfBreath: boolean; fever: boolean; dizziness: boolean; freeText?: string } | null }) => {
      setTriageResult({ severity: triage.severity, reasoning: triage.reasoning });
      goTo('loading');
      setError(null);

      const routeBody: Record<string, unknown> = {
        severity: triage.severity,
        city: cityId,
        symptoms: triage.symptoms || {
          chestPain: false,
          shortnessOfBreath: false,
          fever: false,
          dizziness: false,
          freeText: triage.reasoning,
        },
      };

      if (userCoords) {
        routeBody.userLat = userCoords.lat;
        routeBody.userLng = userCoords.lng;
      } else if (postalCode.trim()) {
        routeBody.postalCode = postalCode.trim();
      } else {
        routeBody.userLat = 18.5204; // Pune Default
        routeBody.userLng = 73.8567;
      }

      try {
        const routeController = new AbortController();
        const routeTimeout = setTimeout(() => routeController.abort(), API_TIMEOUT_MS);

        const routeRes = await fetch('/api/clearpath/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeBody),
          signal: routeController.signal,
        });

        clearTimeout(routeTimeout);

        if (!routeRes.ok) {
          let message = 'No hospitals found nearby. Please try again.';
          try {
            const errBody = (await routeRes.json()) as { error?: string };
            if (errBody?.error) message = errBody.error;
          } catch { /* default */ }
          setError(message);
          goTo('conversation');
          return;
        }

        const json = await routeRes.json();
        if (json?.recommended && Array.isArray(json?.alternatives) && json?.userLocation) {
          const route = json as RouteResponse;
          setRouteResult(route);
          const rec = route.recommended;
          const h = rec?.hospital as { id?: string; _id?: string } | undefined;
          setActiveRouteId(h?.id ?? h?._id ?? null);
          onRecommendation(route, routeBody);
          goTo('result');
        } else {
          setError('No hospitals found nearby. Please try again.');
          goTo('conversation');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request took too long. Please try again.');
        } else {
          setError('Unable to find hospitals right now. Please try again.');
        }
        goTo('conversation');
      }
    },
    [cityId, userCoords, postalCode, onRecommendation, goTo]
  );

  const resetFlow = () => {
    setDirection(-1);
    setStep('location');
    setTriageResult(null);
    setRouteResult(null);
    setActiveRouteId(null);
    setUserCoords(null);
    setError(null);
    onRecommendation(null);
  };

  const handleShowRoute = useCallback(
    (scored: ScoredHospital) => {
      if (!routeResult) return;
      const h = scored.hospital as { id?: string; _id?: string };
      const hId = h?.id ?? h?._id ?? null;
      if (hId && hId === activeRouteId) return;
      setActiveRouteId(hId);
      const updated = { ...routeResult, activeRoute: scored };
      onRecommendation(updated, undefined);
    },
    [routeResult, activeRouteId, onRecommendation]
  );

  const canStart = postalCode.trim().length > 0 || userCoords !== null;
  const currentStepIdx = stepIndex(step);

  return (
    <div className="flex flex-col w-[380px] bg-white/50 backdrop-blur-2xl border border-white/75 shadow-[0_4px_28px_rgba(99,102,241,0.09),0_1px_4px_rgba(0,0,0,0.04)] rounded-[20px] overflow-hidden pointer-events-auto h-[90vh] max-h-[800px]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100/50 bg-white/40">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Clearline</h2>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Triage & Routing</p>
          </div>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50/90 border-b border-red-100 px-6 py-3"
          >
            <p className="text-xs font-semibold text-red-600">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-5 custom-scrollbar relative">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 'location' && (
            <motion.div key="location" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Location Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => { setPostalCode(e.target.value); setUserCoords(null); }}
                    placeholder="Enter postal code"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-3 opacity-60">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="space-y-3">
                  <motion.button
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 rounded-2xl text-sm font-bold shadow-sm transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    {locating ? (
                      <><div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" /> Locating...</>
                    ) : userCoords ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg> Detected</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Use GPS</>
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => goTo('conversation')}
                    disabled={!canStart}
                    className={`w-full flex items-center justify-center px-4 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all ${!canStart ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-600/20'}`}
                    whileTap={canStart ? { scale: 0.98 } : {}}
                  >
                    Start Triage
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'conversation' && (
            <motion.div key="conversation" className="h-full" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <VoiceTriage onTriageComplete={handleTriageComplete} />
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-800 mt-6">Analyzing Health Data...</p>
                <p className="text-xs font-medium text-slate-500 mt-2 text-center max-w-[200px]">Matching triage severity with live hospital wait times</p>
              </div>
            </motion.div>
          )}

          {step === 'result' && triageResult && routeResult && (
            <motion.div key="result" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <RoutingResult
                severity={triageResult.severity}
                reasoning={triageResult.reasoning}
                recommended={routeResult.recommended}
                alternatives={routeResult.alternatives}
                onBack={resetFlow}
                onShowRoute={handleShowRoute}
                activeRouteId={activeRouteId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="shrink-0 px-6 py-4 bg-slate-50/50 border-t border-slate-100/50 mt-auto">
        <div className="flex gap-1.5 w-full mb-3">
          {(['location', 'conversation', 'result'] as Step[]).map((s, i) => (
            <motion.div
              key={s}
              className="h-1 flex-1 rounded-full bg-slate-200 overflow-hidden"
            >
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: currentStepIdx >= i ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </motion.div>
          ))}
        </div>
        <p className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest">
          {step === 'location' && 'Step 1 • Location Verify'}
          {step === 'conversation' && 'Step 2 • Voice Triage'}
          {step === 'loading' && 'Routing Engine Active'}
          {step === 'result' && 'Step 3 • Recommendation'}
        </p>
      </div>
    </div>
  );
}
