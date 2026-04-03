'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import SimulationResultPanel from './SimulationResultPanel';
import BlueprintPicker from './BlueprintPicker';
import type { Blueprint, BlueprintMetadata, ProposedBuilding } from '@/lib/clearpath/blueprints';

interface GovernmentSidebarProps {
  cityId: string;
  proposedLocations: ProposedBuilding[];
  onProposedLocationsChange: (locations: ProposedBuilding[]) => void;
  onSimulationResult: (result: any) => void;
  onBlueprintChange?: (blueprint: Blueprint | null) => void;
  onRemoveCustomBlueprint?: (blueprint: Blueprint) => void;
  customBlueprints?: Blueprint[];
  importedBlueprint?: Blueprint | null;
}

export default function GovernmentSidebar({
  cityId,
  proposedLocations,
  onProposedLocationsChange,
  onSimulationResult,
  onBlueprintChange,
  onRemoveCustomBlueprint,
  customBlueprints = [],
  importedBlueprint,
}: GovernmentSidebarProps) {
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(importedBlueprint ?? null);
  const [simResult, setSimResult] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  // Auto-select imported blueprint when it arrives
  useEffect(() => {
    if (importedBlueprint && selectedBlueprint?.id !== importedBlueprint.id) {
      setSelectedBlueprint(importedBlueprint);
      onBlueprintChange?.(importedBlueprint);
    }
  }, [importedBlueprint]);

  useEffect(() => {
    fetch(`/api/clearpath/hospitals?city=${cityId}`)
      .then(r => r.json())
      .then(setHospitals)
      .catch(console.error);
  }, [cityId]);

  useEffect(() => {
    function handleMapClick() {
      setSimResult(null);
    }
    window.addEventListener('clearpath:mapclick' as any, handleMapClick);
    return () => window.removeEventListener('clearpath:mapclick' as any, handleMapClick);
  }, []);

  const runSimulation = useCallback(async () => {
    if (proposedLocations.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clearpath/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityId,
          proposals: proposedLocations.map((b) => ({
            lat: b.lat,
            lng: b.lng,
            capacity: b.blueprint.beds,
            erBeds: b.blueprint.metadata?.erBeds,
          })),
        }),
      });
      const result = await res.json();
      setSimResult(result);
      onSimulationResult(result);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [proposedLocations, cityId, onSimulationResult]);

  const updateBuilding = useCallback(
    (id: string, updates: Partial<{ lat: number; lng: number; rotation: number }>) => {
      onProposedLocationsChange(
        proposedLocations.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
      setSimResult(null);
    },
    [proposedLocations, onProposedLocationsChange]
  );

  const removeBuilding = useCallback(
    (id: string) => {
      onProposedLocationsChange(proposedLocations.filter((b) => b.id !== id));
      setSimResult(null);
    },
    [proposedLocations, onProposedLocationsChange]
  );

  const clearAll = useCallback(() => {
    onProposedLocationsChange([]);
    setSimResult(null);
  }, [onProposedLocationsChange]);

  const handleBlueprintSelect = useCallback((bp: Blueprint) => {
    const next = selectedBlueprint?.id === bp.id ? null : bp;
    setSelectedBlueprint(next);
    onBlueprintChange?.(next);
  }, [selectedBlueprint, onBlueprintChange]);

  return (
    <div className="flex flex-col w-[420px] bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(99,102,241,0.12)] pointer-events-auto rounded-[24px] h-full max-h-[85vh] mr-4">
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-t-[24px] p-5 shrink-0 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-white text-[15px] font-bold tracking-wide">Government Dashboard</h2>
          <p className="text-indigo-100 text-[11px] font-medium tracking-wide mt-1">Network Simulation & Assesment</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <Link
          href="/editor"
          className="flex w-full items-center justify-center gap-2 border border-white/90 bg-white/70 text-indigo-700 text-[12px] font-bold tracking-wide py-3.5 rounded-full shadow-[0_2px_10px_rgba(99,102,241,0.08)] hover:bg-white hover:shadow-[0_4px_14px_rgba(99,102,241,0.12)] transition-all"
        >
          <span aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </span>
          Open 3D Map Editor
        </Link>

        <div className="border border-white/80 bg-white/50 backdrop-blur-xl p-5 space-y-4 shadow-[0_2px_12px_rgba(99,102,241,0.06)] rounded-[20px]">
          <div className="flex items-center gap-3 border-b border-indigo-100 pb-3">
            <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">Step 1</span>
            <h3 className="text-[13px] font-bold text-slate-800 tracking-wide">Select Asset Blueprint</h3>
          </div>
          <BlueprintPicker selected={selectedBlueprint} onSelect={handleBlueprintSelect} onRemoveCustom={onRemoveCustomBlueprint} customBlueprints={customBlueprints} />
        </div>

        <div className="border border-white/80 bg-white/50 backdrop-blur-xl p-5 space-y-4 shadow-[0_2px_12px_rgba(99,102,241,0.06)] rounded-[20px]">
          <div className="flex flex-col gap-1 border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">Step 2</span>
              <h3 className="text-[13px] font-bold text-slate-800 tracking-wide">Map Plotting</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 pl-[50px]">
              {selectedBlueprint
                ? 'Awaiting parcel click on map...'
                : 'Blocked: No blueprint selected.'}
            </p>
          </div>
          {proposedLocations.length > 0 && (
            <div className="space-y-3">
              {proposedLocations.map((b) => {
                const degrees = Math.round((b.rotation ?? 0) * (180 / Math.PI));
                const meta = b.blueprint.metadata;
                const isExpanded = expandedDetails[b.id] ?? false;
                return (
                  <div key={b.id} className="border border-white/90 bg-white/80 p-3 space-y-3 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <span className="text-[12px] font-bold text-slate-800 truncate">
                        {b.blueprint.name} <span className="text-indigo-600 font-medium px-1 bg-indigo-50 rounded">({b.blueprint.beds} beds)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBuilding(b.id)}
                        className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                    {/* Metadata dropdown */}
                    {meta && (
                      <div className="bg-white border border-indigo-50 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedDetails((prev) => ({ ...prev, [b.id]: !prev[b.id] }))}
                          className="flex items-center justify-between w-full text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors p-2.5"
                        >
                          <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                            Asset Details
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="p-3 border-t border-indigo-50 bg-slate-50/50">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                              <MetaRow label="ER Beds" value={meta.erBeds} />
                              <MetaRow label="Op Rooms" value={meta.operatingRooms} />
                              <MetaRow label="Trauma Rm" value={meta.traumaRooms} />
                              <MetaRow label="Staff" value={meta.doctors + meta.nurses} />
                              <MetaRow label="Ambulance" value={meta.ambulances} />
                              <MetaRow label="Footprint" value={`${meta.totalFloorArea.toLocaleString()}m²`} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Rotation */}
                    <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-lg flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 tracking-wide flex justify-between pr-1">
                        Yaw Rotation <span className="text-indigo-600">{degrees}°</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={5}
                        value={degrees}
                        onChange={(e) =>
                          updateBuilding(b.id, { rotation: Number(e.target.value) * (Math.PI / 180) })
                        }
                        className="w-full h-1.5 mt-1 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                      />
                    </div>
                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-lg flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 tracking-wide">
                          Lat
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={b.lat.toFixed(6)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateBuilding(b.id, { lat: val });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-lg flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 tracking-wide">
                          Lng
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={b.lng.toFixed(6)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateBuilding(b.id, { lng: val });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={clearAll}
                className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 tracking-wide font-bold text-[11px] py-2.5 rounded-xl transition-colors"
              >
                Clear All Plots
              </button>
            </div>
          )}
        </div>

        <div className="border border-white/80 bg-white/50 backdrop-blur-xl p-5 shadow-[0_2px_12px_rgba(99,102,241,0.06)] rounded-[20px]">
          <div className="flex items-center gap-3 border-b border-indigo-100 pb-3 mb-4">
            <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">Step 3</span>
            <h3 className="text-[13px] font-bold text-slate-800 tracking-wide">Execute Simulation</h3>
          </div>
          <button
            onClick={runSimulation}
            disabled={proposedLocations.length === 0 || loading}
            className={`w-full py-3.5 rounded-full flex items-center justify-center font-bold tracking-wide text-[12px] transition-all shadow-sm border ${proposedLocations.length > 0 && !loading
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-600 text-white hover:from-indigo-500 hover:to-indigo-400 hover:shadow-[0_4px_14px_rgba(99,102,241,0.25)]'
              : 'bg-white/50 border-white text-slate-400 cursor-not-allowed'
              }`}
          >
            {loading ? 'Running Network Analysis...' : 'Re-calculate Voronoi Dispatch'}
          </button>
          {proposedLocations.length === 0 && (
            <p className="text-[11px] text-slate-500 text-center mt-3 font-medium">
              Waiting for initial parcel selection
            </p>
          )}
        </div>

        {simResult && (
          <SimulationResultPanel
            result={simResult}
            hospitals={hospitals}
            proposedLabels={Object.fromEntries(
              proposedLocations.map((b, i) => [`proposed-${i}`, `${b.blueprint.name} (new)`])
            )}
          />
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-bold text-right">{value}</span>
    </>
  );
}
