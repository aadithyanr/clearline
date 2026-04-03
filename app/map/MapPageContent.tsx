'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ClearPathMap from '@/components/clearpath/ClearPathMap';
import ModeToggle from '@/components/clearpath/ModeToggle';
import DayNightToggle from '@/components/clearpath/DayNightToggle';
import CitySelector from '@/components/clearpath/CitySelector';
import GovernmentSidebar from '@/components/clearpath/government/GovernmentSidebar';
import CivilianPanel from '@/components/clearpath/civilian/CivilianPanel';
import TrafficTimeline from '@/components/clearpath/TrafficTimeline';
import { CITIES } from '@/lib/map-3d/cities';
import { createBlueprintFromBuilding, type Blueprint } from '@/lib/clearpath/blueprints';
import type { TimelinePrediction, RerouteAlert } from '@/lib/clearpath/trafficPrediction';
import type { ProposedBuilding } from '@/lib/clearpath/blueprints';

export default function MapPageContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'government' ? 'government' : searchParams.get('mode') === 'civilian' ? 'civilian' : 'civilian';
  const [mode, setMode] = useState<'government' | 'civilian'>(initialMode);
  const [selectedCity, setSelectedCity] = useState<typeof CITIES[0] | null>(null);
  const mapCity = selectedCity ?? CITIES[0];
  const [simulationResult, setSimulationResult] = useState(null);
  const [recommendedHospital, setRecommendedHospital] = useState<any>(null);
  const [proposedLocations, setProposedLocations] = useState<ProposedBuilding[]>([]);
  const [trafficPrediction, setTrafficPrediction] = useState<TimelinePrediction | null>(null);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [customBlueprints, setCustomBlueprints] = useState<Blueprint[]>([]);
  const [importedBlueprint, setImportedBlueprint] = useState<Blueprint | null>(null);
  const [mapTheme, setMapTheme] = useState<'night' | 'day' | 'satellite'>('satellite');
  const mapStyle = mapTheme === 'night'
    ? 'mapbox://styles/mapbox/navigation-night-v1'
    : mapTheme === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/navigation-day-v1';

  // Load all saved custom buildings on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/editor/building');
        if (!res.ok) return;
        const { buildings } = await res.json();
        const bps = buildings.map((b: any) => createBlueprintFromBuilding(b));
        setCustomBlueprints(bps);
      } catch (err) {
        console.error('Failed to load custom buildings:', err);
      }
    })();
  }, []);

  // Handle buildingId query param from editor export — auto-select the imported building
  useEffect(() => {
    const buildingId = searchParams.get('buildingId');
    if (!buildingId || customBlueprints.length === 0) return;

    const bp = customBlueprints.find((b) => b.id === `custom-${buildingId}`);
    if (bp && importedBlueprint?.id !== bp.id) {
      setImportedBlueprint(bp);
      setSelectedBlueprint(bp);
      setMode('government');
    }
  }, [searchParams, customBlueprints]);

  const handleRemoveCustomBlueprint = useCallback(async (bp: Blueprint) => {
    // Extract the raw building ID (strip "custom-" prefix)
    const rawId = bp.id.replace(/^custom-/, '');
    try {
      await fetch('/api/editor/building', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rawId }),
      });
    } catch (err) {
      console.error('Failed to delete building:', err);
    }
    setCustomBlueprints((prev) => prev.filter((b) => b.id !== bp.id));
    if (selectedBlueprint?.id === bp.id) setSelectedBlueprint(null);
    if (importedBlueprint?.id === bp.id) setImportedBlueprint(null);
    // Remove any placed instances using this blueprint
    setProposedLocations((prev) => prev.filter((loc) => loc.blueprint.id !== bp.id));
  }, [selectedBlueprint, importedBlueprint]);

  const originalRouteRef = useRef<any>(null);
  const lastRouteParamsRef = useRef<any>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }, blueprint: Blueprint | null) => {
    if (mode === 'government' && blueprint) {
      const id = `proposed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setProposedLocations((prev) => [...prev, { id, lat: lngLat.lat, lng: lngLat.lng, rotation: 0, blueprint }]);
      window.dispatchEvent(new CustomEvent('clearpath:mapclick', { detail: { lngLat, blueprint } }));
    }
  }, [mode]);

  const handleProposedLocationUpdate = useCallback((id: string, lngLat: { lng: number; lat: number }) => {
    setProposedLocations((prev) =>
      prev.map((b) => (b.id === id ? { ...b, lng: lngLat.lng, lat: lngLat.lat } : b))
    );
  }, []);

  const handleCityChange = useCallback((city: (typeof CITIES)[0] | null) => {
    setSelectedCity(city);
  }, []);

  const handleModeChange = useCallback((newMode: 'government' | 'civilian') => {
    setMode(newMode);
    if (newMode === 'government') {
      setRecommendedHospital(null);
      setTrafficPrediction(null);
    } else {
      setProposedLocations([]);
      setSimulationResult(null);
      setSelectedBlueprint(null);
    }
  }, []);

  const handleRecommendation = useCallback((result: any, routeParams?: any) => {
    setRecommendedHospital(result);
    if (routeParams) lastRouteParamsRef.current = routeParams;
    if (result && !originalRouteRef.current) {
      originalRouteRef.current = result;
    }
    if (!result) {
      originalRouteRef.current = null;
      lastRouteParamsRef.current = null;
      setTrafficPrediction(null);
    }
  }, []);

  const handleTimeChange = useCallback((prediction: TimelinePrediction, dragging: boolean) => {
    setTrafficPrediction(prediction);
    setIsTimelineDragging(dragging);
  }, []);

  const handleRerouteRequest = useCallback(async (alert: RerouteAlert) => {
    const orig = recommendedHospital ?? originalRouteRef.current;
    if (!orig?.alternatives?.length) return;

    // Find the suggested alternative by name, fall back to first alternative
    const suggestedName = alert.suggestedHospital;
    const matchIdx = suggestedName
      ? orig.alternatives.findIndex(
        (a: any) => (a.hospital?.name ?? a.name) === suggestedName
      )
      : 0;
    const altIdx = matchIdx >= 0 ? matchIdx : 0;
    const bestAlt = orig.alternatives[altIdx];

    const swapped = {
      ...orig,
      recommended: bestAlt,
      alternatives: [
        orig.recommended,
        ...orig.alternatives.filter((_: any, i: number) => i !== altIdx),
      ],
      activeRoute: undefined, // clear any "Show Route" override
    };
    originalRouteRef.current = swapped;
    setRecommendedHospital(swapped);
  }, [recommendedHospital]);

  const rec = recommendedHospital?.recommended;
  const activeRec = recommendedHospital?.activeRoute ?? rec;
  const showTimeline = mode === 'civilian' && (activeRec?.routeGeometry || rec?.routeGeometry);

  return (
    <div className={`fixed inset-0 overflow-hidden ${mapTheme === 'night' ? 'cp-night' : ''}`}>
      <ClearPathMap
        mode={mode}
        cityId={mapCity.id}
        cityConfig={mapCity}
        simulationResult={simulationResult}
        recommendedHospital={recommendedHospital}
        onMapClick={handleMapClick}
        onProposedLocationUpdate={handleProposedLocationUpdate}
        proposedLocations={proposedLocations}
        trafficPrediction={trafficPrediction}
        trafficDragging={isTimelineDragging}
        selectedBlueprint={selectedBlueprint}
        mapStyle={mapStyle}
      />
      <div className='cp-map-rail'>
        <div className="flex items-center justify-start gap-3 w-full">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-indigo-600 bg-white/70 border border-white/90 shadow-[0_2px_10px_rgba(99,102,241,0.12)] backdrop-blur-xl hover:bg-white/90 transition-all"
            aria-label="Back to home"
          >
            <span aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </span>
            <span>Back to Home</span>
          </Link>
          <DayNightToggle theme={mapTheme} onChange={setMapTheme} />
        </div>
        {!searchParams.get('mode') && (
          <ModeToggle mode={mode} onChange={handleModeChange} />
        )}
        <CitySelector
          cities={CITIES}
          currentCityId={selectedCity?.id ?? ''}
          onCityChange={handleCityChange}
        />
        <div className='cp-map-panel-wrap'>
          {mode === 'government' ? (
            <GovernmentSidebar
              cityId={mapCity.id}
              proposedLocations={proposedLocations}
              onProposedLocationsChange={setProposedLocations}
              onSimulationResult={setSimulationResult}
              onBlueprintChange={setSelectedBlueprint}
              onRemoveCustomBlueprint={handleRemoveCustomBlueprint}
              customBlueprints={customBlueprints}
              importedBlueprint={importedBlueprint}
            />
          ) : selectedCity ? (
            <CivilianPanel
              cityId={selectedCity.id}
              onRecommendation={handleRecommendation}
              currentRecommendation={recommendedHospital}
            />
          ) : (
            <div className="flex flex-col w-[380px] bg-white/50 backdrop-blur-2xl border border-white/75 shadow-[0_4px_28px_rgba(99,102,241,0.09),0_1px_4px_rgba(0,0,0,0.04)] rounded-[20px] overflow-hidden pointer-events-auto items-center justify-center p-8 text-center min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Clearline</h2>
              <p className="text-sm font-medium text-slate-600 mt-3 leading-relaxed">
                Please select a <strong className="text-blue-600">Pune region</strong> from the dropdown above to initialize data.
              </p>
            </div>
          )}
        </div>
      </div>

      {showTimeline && (
        <TrafficTimeline
          congestionSegments={activeRec.congestionSegments}
          segmentCount={activeRec.routeGeometry?.coordinates?.length ?? 0}
          onTimeChange={handleTimeChange}
          onRerouteRequest={handleRerouteRequest}
          recommended={activeRec}
          alternatives={recommendedHospital?.alternatives ?? []}
          isRerouting={isRerouting}
        />
      )}
    </div>
  );
}
