'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import ClearPathMap from '@/components/clearpath/ClearPathMap';
import DispatchSidebar from '@/components/clearpath/dispatch/DispatchSidebar';
import HospitalLoadPanel from '@/components/clearpath/dispatch/HospitalLoadPanel';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';
import type { RoutingConstraints, ScoredHospital } from '@/lib/clearpath/types';
import { CITIES } from '@/lib/map-3d/cities';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DispatchPageContent() {
  const [cityId] = useState('pune');
  const cityConfig = CITIES.find(c => c.id === cityId) || CITIES[0];

  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);
  const [constraints, setConstraints] = useState<RoutingConstraints>({
    maxOccupancyPct: 95,
    massCasualtyMode: false,
  });
  const [routeOptions, setRouteOptions] = useState<{ recommended: ScoredHospital; alternatives: ScoredHospital[] } | null>(null);
  const [routeOptionsLoading, setRouteOptionsLoading] = useState(false);

  // Poll for active cases
  const { data: casesData, mutate } = useSWR('/api/dispatch/cases', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  const cases = casesData?.cases || [];

  // Poll for hospital load (for side panel)
  const { data: hospData } = useSWR(`/api/clearpath/hospitals?city=${cityId}`, fetcher, {
    dedupingInterval: 60000
  });
  const { data: congData } = useSWR(`/api/clearpath/congestion?city=${cityId}`, fetcher, {
    refreshInterval: 10000
  });

  const hospitals = hospData || [];
  const congestion = congData || [];

  // Update selected case if it changed in the background
  useEffect(() => {
    if (selectedCase) {
      const updated = cases.find((c: EmergencyCase) => c.caseId === selectedCase.caseId);
      if (updated && updated.updatedAt !== selectedCase.updatedAt) {
        setSelectedCase(updated);
      }
    }
  }, [cases, selectedCase]);

  // SSE stream for near-real-time case updates. SWR polling remains as fallback.
  useEffect(() => {
    const eventSource = new EventSource('/api/dispatch/cases/stream');

    const onCases = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (Array.isArray(payload?.cases)) {
          mutate({ cases: payload.cases }, false);
        }
      } catch {
        // ignore malformed events and continue polling fallback
      }
    };

    eventSource.addEventListener('cases', onCases as EventListener);
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener('cases', onCases as EventListener);
      eventSource.close();
    };
  }, [mutate]);

  useEffect(() => {
    const selectedCaseId = selectedCase?.caseId;
    if (!selectedCaseId) {
      setRouteOptions(null);
      return;
    }

    let cancelled = false;

    async function loadRouteOptions() {
      setRouteOptionsLoading(true);
      try {
        const res = await fetch(`/api/dispatch/cases/${selectedCaseId}/options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ constraints }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setRouteOptions({
            recommended: data.recommended,
            alternatives: data.alternatives ?? [],
          });
        }
      } catch {
        if (!cancelled) setRouteOptions(null);
      } finally {
        if (!cancelled) setRouteOptionsLoading(false);
      }
    }

    loadRouteOptions();
    return () => {
      cancelled = true;
    };
  }, [selectedCase?.caseId, constraints]);

  async function handleOverride(caseId: string, newHospital: any) {
    try {
      const res = await fetch(`/api/dispatch/cases/${caseId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newHospital }),
      });
      if (res.ok) {
        await mutate(); // instantly refresh cases
        // We do NOT setSelectedCase(null) here so the user stays on the case
        // and watches the map re-draw the routing vector right in front of them.
      }
    } catch (err) {
      console.error('Failed to override', err);
    }
  }

  async function handleHospitalAck(caseId: string, hospitalId: string) {
    try {
      const res = await fetch(`/api/hospital/${hospitalId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          actorId: 'dispatch-ui',
          reason: 'Hospital acknowledged intake from dispatch panel',
        }),
      });
      if (res.ok) {
        await mutate();
      }
    } catch (err) {
      console.error('Failed to acknowledge hospital assignment', err);
    }
  }

  async function handleHospitalReject(caseId: string, hospitalId: string) {
    try {
      const res = await fetch(`/api/hospital/${hospitalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          actorId: 'dispatch-ui',
          reason: 'Hospital rejected intake from dispatch panel',
        }),
      });
      if (res.ok) {
        await mutate();
      }
    } catch (err) {
      console.error('Failed to reject hospital assignment', err);
    }
  }

  // Create a pseudo 'RouteRecommendation' object for ClearPathMap to draw routes
  // if a specific case is selected, so dispatchers see the literal route the ambulance is taking.
  const recommendedHospital = selectedCase ? {
    recommended: selectedCase.assignedHospital,
    alternatives: selectedCase.alternatives || [],
    userLocation: selectedCase.userLocation,
  } : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 flex font-sans">

      {/* 3D Map takes up full background */}
      <ClearPathMap
        mode="civilian"
        cityId={cityId}
        cityConfig={cityConfig}
        simulationResult={null}
        recommendedHospital={recommendedHospital}
        dispatchCases={cases}
        selectedDispatchCase={selectedCase?.caseId}
        onDispatchCaseSelect={setSelectedCase}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
      />

      {/* Main layout container for UI overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col md:flex-row justify-between p-4">

        {/* Left Side: Hospital Load and potentially other controls */}
        <div className="flex flex-col flex-1 h-full max-w-sm pointer-events-none gap-4">
          {/* <div className="civ-panel pointer-events-auto w-fit p-3 !rounded-[1.2rem] shadow-lg"> */}
          {/* <h1 className="text-slate-800 font-extrabold text-lg flex items-center gap-2 tracking-tight">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              Dispatch Command
            </h1> */}
          {/* </div> */}
          <HospitalLoadPanel hospitals={hospitals} congestion={congestion} />
        </div>

        {/* Right Side: Flow Case Sidebar */}
        <div className="pointer-events-auto h-full flex flex-col justify-stretch">
          <DispatchSidebar
            cases={cases}
            hospitals={hospitals}
            congestion={congestion}
            constraints={constraints}
            onConstraintsChange={setConstraints}
            routeOptions={routeOptions}
            routeOptionsLoading={routeOptionsLoading}
            selectedCaseId={selectedCase?.caseId}
            onCaseSelect={setSelectedCase}
            onOverrideSubmit={handleOverride}
            onHospitalAck={handleHospitalAck}
            onHospitalReject={handleHospitalReject}
          />
        </div>

      </div>
    </div>
  );
}
