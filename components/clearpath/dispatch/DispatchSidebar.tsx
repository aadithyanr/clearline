'use client';

import { useState } from 'react';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';
import type { ScoredHospital } from '@/lib/clearpath/types';

interface DispatchSidebarProps {
  cases: EmergencyCase[];
  hospitals: any[];
  congestion: any[];
  selectedCaseId?: string | null;
  onCaseSelect: (c: EmergencyCase | null) => void;
  onOverrideSubmit: (caseId: string, newHospital: ScoredHospital) => Promise<void>;
}

export default function DispatchSidebar({ cases, hospitals, congestion, selectedCaseId, onCaseSelect, onOverrideSubmit }: DispatchSidebarProps) {
  const [isOverriding, setIsOverriding] = useState(false);

  const selectedCase = cases.find(c => c.caseId === selectedCaseId);

  // Helper to extract rich bed info for a given hospital ID
  function getHospitalInfo(hospId: string) {
    const h = hospitals.find(x => x.id === hospId || x._id?.toString() === hospId);
    const c = congestion.find(x => x.hospitalId === hospId);
    if (!h) return null;
    const occ = c?.occupancyPct ?? 0;
    const totalBeds = h.totalBeds ?? 100;
    const erBeds = h.erBeds ?? 10;
    return {
      occupancyPct: occ,
      waitMinutes: c?.waitMinutes ?? 0,
      totalBeds,
      erBeds,
      availableTotal: Math.max(0, Math.floor(totalBeds * ((100 - occ) / 100))),
      availableER: Math.max(0, Math.floor(erBeds * ((100 - occ) / 100))),
      specialties: h.specialties ?? []
    };
  }

  async function handleSimulateMCI() {
    setIsOverriding(true);
    try {
      const highwayCluster = [
        { message: "Multi-vehicle pileup. Severe head trauma, unconscious.", userLat: 18.5028, userLng: 73.8116 },
        { message: "Car crushed, driver has major burns and cannot breathe.", userLat: 18.5034, userLng: 73.8121 },
        { message: "Pedestrian hit by debris, massive bleeding from leg.", userLat: 18.5022, userLng: 73.8111 },
        { message: "Chest pain and struggling to breathe at crash site.", userLat: 18.5038, userLng: 73.8130 },
      ];
      
      const res = await fetch('/api/dispatch/cases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: highwayCluster })
      });
      
      if (res.ok) {
         // Auto-refresh cases via page mutation logic if we had access here, 
         // but wait, SWR polls every 3 seconds anyway, so the new cases will appear automatically!
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOverriding(false);
    }
  }

  return (
    <div className="civ-panel h-[calc(100vh-2rem)] w-full sm:w-[380px] pointer-events-auto flex flex-col">
      <div className="civ-header !mb-3 flex justify-between items-center pr-2">
        <div className="flex items-center gap-2">
          <div className="civ-header-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-6"/>
              <path d="M9 15h6"/>
            </svg>
          </div>
          <div>
            <h2 className="civ-header-title">Live Dispatch</h2>
            <p className="civ-header-sub">{cases.length} Active Cases</p>
          </div>
        </div>
        
        <button 
          onClick={handleSimulateMCI}
          disabled={isOverriding}
          className="text-[0.65rem] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 px-2 py-1.5 rounded-lg transition-transform active:scale-95 flex items-center gap-1 shadow-sm"
        >
          {isOverriding ? 'Routing...' : '⚠️ Simulate MCI'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 flex flex-col gap-3">
        {selectedCase ? (
          <div>
            <button onClick={() => onCaseSelect(null)} className="text-[0.75rem] font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1 mb-4 hover:text-sky-800 transition-colors">
              &larr; Back to List
            </button>
            
            <div className="mb-4">
              <span className={`civ-badge ${selectedCase.triage.severity === 'critical' ? 'civ-badge--purple bg-red-100 text-red-700' : 'civ-badge--sky'}`}>
                {selectedCase.triage.severity} 
              </span>
              {selectedCase.incidentId && (
                <span className="ml-2 civ-badge bg-amber-100 text-amber-800 border-amber-300">
                  {selectedCase.incidentId}
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-800 tracking-tight mt-1">{selectedCase.caseId}</h3>
              
              {/* Assigned Details Box */}
              <div className="mt-3 bg-white p-3 rounded-xl border border-sky-200 shadow-sm border-b-4 border-b-sky-400">
                <p className="text-[0.8rem] text-slate-500 font-medium uppercase tracking-widest mb-1">Target Hospital</p>
                <p className="font-bold text-slate-800">{selectedCase.assignedHospital?.hospital?.name}</p>
                
                {(() => {
                  const info = getHospitalInfo(selectedCase.assignedHospital?.hospital?.id);
                  if (!info) return null;
                  return (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[0.7rem]">
                      <div className="bg-slate-50 p-1.5 rounded flex flex-col">
                        <span className="text-slate-400 uppercase tracking-wider font-bold text-[0.6rem]">Occupancy</span>
                        <span className={`font-bold ${info.occupancyPct > 80 ? 'text-red-600' : 'text-sky-700'}`}>{Math.round(info.occupancyPct)}% (Wait: {info.waitMinutes}m)</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded flex flex-col">
                        <span className="text-slate-400 uppercase tracking-wider font-bold text-[0.6rem]">Available Beds</span>
                        <span className="font-bold text-slate-700">ER: {info.availableER} | Gen: {info.availableTotal}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Reasoning</p>
              <p className="text-sm text-slate-700 italic">"{selectedCase.triage.reasoning}"</p>
              {selectedCase.triage.predictedNeeds?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedCase.triage.predictedNeeds.map((need: string) => (
                    <span key={need} className="text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">{need}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-2">Original Message</p>
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm text-slate-800">
                {selectedCase.patientMessage}
              </div>
            </div>

            <div className="mb-4 border-t border-slate-100 pt-4">
              <h4 className="text-[0.8rem] font-bold uppercase tracking-widest text-slate-600 mb-3">Re-Route Alternatives</h4>
              <div className="flex flex-col gap-3">
                {selectedCase.alternatives?.map((alt: any) => {
                  const altInfo = getHospitalInfo(alt.hospital.id);
                  return (
                    <div key={alt.hospital.id} className="flex flex-col gap-2 border border-slate-200 hover:border-sky-300 transition-colors rounded-xl p-3 bg-white shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800 leading-tight">{alt.hospital.name}</span>
                        <span className="text-[0.75rem] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md self-start">{alt.totalEstimatedMinutes} min</span>
                      </div>
                      <p className="text-[0.7rem] text-slate-500">{alt.reason}</p>

                      {/* Bed & Occ info for alternative */}
                      {altInfo && (
                        <div className="flex items-center gap-2 mt-1 mb-1 border-t border-slate-100 pt-2">
                          <div className="text-[0.65rem] font-medium bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">
                            Occ: <span className={altInfo.occupancyPct > 80 ? 'text-red-500 font-bold' : ''}>{Math.round(altInfo.occupancyPct)}%</span>
                          </div>
                          <div className="text-[0.65rem] font-medium bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">
                            ER Beds: <span className={altInfo.availableER < 3 ? 'text-red-500 font-bold' : ''}>{altInfo.availableER}</span>
                          </div>
                          <div className="text-[0.65rem] font-medium bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">
                            Wait: {altInfo.waitMinutes}m
                          </div>
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          setIsOverriding(true);
                          await onOverrideSubmit(selectedCase.caseId, alt);
                          setIsOverriding(false);
                        }}
                        disabled={isOverriding}
                        className="mt-1 w-full civ-btn civ-btn--ghost py-1.5 text-[0.75rem] bg-sky-50/50 hover:bg-sky-100/50 border-sky-100 text-sky-700"
                      >
                        Override to here
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        ) : (
          cases.map(c => (
            <div
              key={c.caseId}
              onClick={() => onCaseSelect(c)}
              className={`civ-hospital-card civ-hospital-card--top cursor-pointer group hover:bg-slate-50 transition-all hover:scale-[1.01] ${c.incidentId ? 'border-amber-200 bg-amber-50/30' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`civ-badge ${c.triage.severity === 'critical' ? 'bg-red-100 text-red-700' : 'civ-badge--sky'}`}>
                    {c.triage.severity}
                  </span>
                  {c.incidentId && (
                    <span className="ml-1.5 text-[0.65rem] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shadow-sm">
                      MCI
                    </span>
                  )}
                  <div className="text-sm font-bold text-slate-800 tracking-tight mt-0.5">{c.caseId}</div>
                </div>
                <div className="text-[0.65rem] text-slate-400 font-medium">
                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <p className="text-[0.75rem] text-slate-600 line-clamp-1 mb-2">"{c.patientMessage}"</p>
              <div className="flex justify-between items-end border-t border-slate-100 pt-2">
                <span className="text-[0.7rem] font-bold text-sky-700">&rarr; {c.assignedHospital?.hospital?.name}</span>
                <span className="text-[0.8rem] font-bold text-slate-800 bg-slate-100 px-1.5 rounded">{c.assignedHospital?.totalEstimatedMinutes}m</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
