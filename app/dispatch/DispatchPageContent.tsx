'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import ClearPathMap from '@/components/clearpath/ClearPathMap';
import DispatchSidebar from '@/components/clearpath/dispatch/DispatchSidebar';
import ScenarioPanel from '@/components/clearpath/dispatch/ScenarioPanel';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';
import type { ScoredHospital } from '@/lib/clearpath/types';
import { CITIES } from '@/lib/map-3d/cities';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DispatchPageContent() {
  const [cityId] = useState('pune');
  const cityConfig = CITIES.find(c => c.id === cityId) || CITIES[0];
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);

  // Cases — poll every 5s, also updated via SSE
  const { data: casesData, mutate } = useSWR('/api/dispatch/cases', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
  const cases: EmergencyCase[] = casesData?.cases || [];

  // Hospital data for the load panel
  const { data: hospData } = useSWR(`/api/clearpath/hospitals?city=${cityId}`, fetcher, {
    dedupingInterval: 60000,
  });
  const { data: congData } = useSWR(`/api/clearpath/congestion?city=${cityId}`, fetcher, {
    refreshInterval: 10000,
  });

  const hospitals = hospData || [];
  const congestion = congData || [];

  // Keep selectedCase in sync when background poll updates it
  useEffect(() => {
    if (selectedCase) {
      const updated = cases.find((c: EmergencyCase) => c.caseId === selectedCase.caseId);
      if (updated && updated.updatedAt !== selectedCase.updatedAt) {
        setSelectedCase(updated);
      }
    }
  }, [cases, selectedCase]);

  // SSE for near-real-time case updates (SWR polling is the fallback)
  useEffect(() => {
    const es = new EventSource('/api/dispatch/cases/stream');
    es.addEventListener('cases', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (Array.isArray(payload?.cases)) {
          mutate({ cases: payload.cases }, false);
        }
      } catch { /* ignore */ }
    });
    es.addEventListener('reroute_alert', () => { void mutate(); });
    es.onerror = () => es.close();
    return () => es.close();
  }, [mutate]);

  async function handleOverride(caseId: string, newHospital: ScoredHospital) {
    try {
      const res = await fetch(`/api/dispatch/cases/${caseId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newHospital }),
      });
      if (res.ok) await mutate();
    } catch (err) {
      console.error('Override failed', err);
    }
  }

  // What the map renders: if a case is selected, draw its specific route
  const recommendedHospital = selectedCase ? {
    recommended: (selectedCase as any).assignedHospital,
    alternatives: (selectedCase.alternatives || []) as any[],
    userLocation: selectedCase.userLocation,
  } : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 flex font-sans">

      {/* Full-screen map */}
      <ClearPathMap
        mode="civilian"
        cityId={cityId}
        cityConfig={cityConfig}
        simulationResult={null}
        recommendedHospital={recommendedHospital}
        dispatchCases={cases}
        selectedDispatchCase={selectedCase?.caseId}
        onDispatchCaseSelect={setSelectedCase}
        mapStyle="mapbox://styles/mapbox/light-v11"
      />

      {/* UI overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 flex justify-between p-4 gap-4">

        {/* Left: Scenarios Panel */}
        <div className="pointer-events-auto flex flex-col h-full w-80">
          <ScenarioPanel
            selectedCaseId={selectedCase?.caseId}
            onMutate={() => void mutate()}
          />
        </div>

        {/* Right: Dispatch Sidebar */}
        <div className="pointer-events-auto h-full flex flex-col justify-stretch">
          <DispatchSidebar
            cases={cases}
            hospitals={hospitals}
            congestion={congestion}
            selectedCaseId={selectedCase?.caseId}
            onCaseSelect={setSelectedCase}
            onOverrideSubmit={handleOverride}
          />
        </div>
      </div>

    </div>
  );
}
