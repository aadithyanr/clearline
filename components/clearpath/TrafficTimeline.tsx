'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  predictTrafficTimeline,
  generateRerouteAlerts,
  type TimelinePrediction,
  type RerouteAlert,
  type RerouteAlertInput,
} from '@/lib/clearpath/trafficPrediction';

interface TrafficTimelineProps {
  congestionSegments?: string[];
  segmentCount: number;
  onTimeChange: (prediction: TimelinePrediction, isDragging: boolean) => void;
  onRerouteRequest: (alert: RerouteAlert) => void;
  recommended?: any;
  alternatives?: any[];
  isRerouting?: boolean;
}

const CONGESTION_COLORS: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  heavy: '#f97316',
  severe: '#dc2626',
};

const TRIGGER_ICONS: Record<RerouteAlert['trigger'], string> = {
  traffic: '\u26A0',
  capacity: '\uD83C\uDFE5',
  diversion: '\uD83D\uDEAB',
  incident: '\uD83D\uDEA7',
  faster_alt: '\u26A1',
};

const TRIGGER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  warning: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
  critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
};

export default function TrafficTimeline({
  congestionSegments,
  segmentCount,
  onTimeChange,
  onRerouteRequest,
  recommended,
  alternatives = [],
  isRerouting = false,
}: TrafficTimelineProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const predictions = useMemo(
    () => predictTrafficTimeline(congestionSegments, segmentCount, 13, 5),
    [congestionSegments, segmentCount]
  );

  const current = predictions[activeStep];

  const alerts = useMemo(() => {
    if (!current || !recommended) return [];
    const input: RerouteAlertInput = {
      prediction: current,
      recommended: {
        hospital: recommended.hospital ?? recommended,
        occupancyPct: recommended.occupancyPct ?? 70,
        distanceKm: recommended.distanceKm ?? 10,
        totalEstimatedMinutes: recommended.totalEstimatedMinutes ?? 30,
        congestionSegments: recommended.congestionSegments,
      },
      alternatives: alternatives.map((a: any) => ({
        hospital: a.hospital ?? a,
        totalEstimatedMinutes: a.totalEstimatedMinutes ?? 30,
      })),
    };
    return generateRerouteAlerts(input).filter(a => !dismissedAlerts.has(a.id));
  }, [current, recommended, alternatives, dismissedAlerts]);

  const updateStep = useCallback(
    (clientX: number, isDrag: boolean) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const step = Math.round(pct * (predictions.length - 1));
      setActiveStep(step);
      onTimeChange(predictions[step], isDrag);
    },
    [predictions, onTimeChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateStep(e.clientX, true);
    },
    [updateStep]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      updateStep(e.clientX, true);
    },
    [updateStep]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    if (predictions[activeStep]) {
      onTimeChange(predictions[activeStep], false);
    }
  }, [activeStep, onTimeChange, predictions]);

  useEffect(() => {
    if (predictions[0]) {
      onTimeChange(predictions[0], false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  }, []);

  if (!current) return null;

  const thumbPct = (activeStep / Math.max(predictions.length - 1, 1)) * 100;

  const segColors = current.segments;
  const barGradient = segColors.length > 1
    ? `linear-gradient(to right, ${segColors.map((s, i) => `${s.color} ${(i / (segColors.length - 1)) * 100}%`).join(', ')})`
    : segColors[0]?.color ?? '#22c55e';

  return (
    <div className="absolute bottom-6 right-6 z-20 w-[min(420px,calc(100vw-2rem))] min-w-[320px]">
      {/* Reroute alert cards — stack above the timeline */}
      {alerts.length > 0 && (
        <div className="mb-2 space-y-2">
          {alerts.map((alert) => {
            const colors = TRIGGER_COLORS[alert.severity];
            return (
              <div
                key={alert.id}
                className={`${colors.bg} ${colors.border} border backdrop-blur-xl rounded-xl px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{TRIGGER_ICONS[alert.trigger]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold ${colors.text} uppercase tracking-wider`}>
                      {alert.title}
                    </p>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => { onRerouteRequest(alert); handleDismiss(alert.id); }}
                        disabled={isRerouting}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${alert.severity === 'critical'
                            ? 'bg-red-500 hover:bg-red-400 text-white'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                          } ${isRerouting ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {isRerouting ? 'Rerouting...' : 'Accept Reroute'}
                      </button>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white/95 backdrop-blur-xl border border-sky-200 rounded-2xl px-5 py-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Traffic Prediction
            </span>
          </div>
          <span className="text-[12px] font-bold text-slate-800">
            {current.label}
          </span>
        </div>

        {/* Congestion preview bar */}
        <div
          className="h-2 rounded-full mb-3 transition-all duration-300"
          style={{ background: barGradient }}
        />

        {/* Slider track */}
        <div
          ref={trackRef}
          className="relative h-6 cursor-pointer touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Track background */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-sky-200" />

          {/* Tick marks */}
          {predictions.map((p, i) => {
            const pct = (i / (predictions.length - 1)) * 100;
            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                style={{
                  left: `${pct}%`,
                  backgroundColor:
                    i <= activeStep ? '#0ea5e9' : '#bae6fd',
                }}
              />
            );
          })}

          {/* Filled track */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full transition-all duration-150"
            style={{
              width: `${thumbPct}%`,
              background: CONGESTION_COLORS[current.segments[0]?.congestion ?? 'low'],
            }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-sm border-2 border-slate-300 transition-left duration-150"
            style={{ left: `${thumbPct}%` }}
          />
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] text-slate-500">Now</span>
          <span className="text-[9px] text-slate-500">{predictions[predictions.length - 1]?.label}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-sky-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    current.avgCongestionLevel < 1.5
                      ? '#22c55e'
                      : current.avgCongestionLevel < 2.5
                        ? '#eab308'
                        : current.avgCongestionLevel < 3.5
                          ? '#f97316'
                          : '#dc2626',
                }}
              />
              <span className="text-[10px] text-slate-600 font-medium">
                {current.avgCongestionLevel < 1.5
                  ? 'Clear'
                  : current.avgCongestionLevel < 2.5
                    ? 'Moderate'
                    : current.avgCongestionLevel < 3.5
                      ? 'Heavy'
                      : 'Severe'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Drive time: {current.drivingTimeMultiplier > 1 ? '+' : ''}
              {Math.round((current.drivingTimeMultiplier - 1) * 100)}%
            </span>
          </div>

          {alerts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] text-amber-700 font-semibold">
                {alerts.length} alert{alerts.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2">
          {(['low', 'moderate', 'heavy', 'severe'] as const).map((level) => (
            <div key={level} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: CONGESTION_COLORS[level] }}
              />
              <span className="text-[8px] text-slate-600 capitalize">{level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
