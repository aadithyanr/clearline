'use client';

function getOccupancyColor(pct: number): string {
  if (pct < 40) return '#22c55e'; // green
  if (pct < 60) return '#eab308'; // yellow
  if (pct < 80) return '#f97316'; // orange
  return '#dc2626'; // red
}

export default function HospitalLoadPanel({ hospitals, congestion }: { hospitals: any[], congestion: any[] }) {
  if (!hospitals.length || !congestion.length) return null;

  // Merge datasets
  const merged = hospitals.map(h => {
    const c = congestion.find((cg: any) => cg.hospitalId === h._id?.toString() || cg.hospitalId === h.id);
    const occ = c?.occupancyPct ?? 0;
    const totalBeds = h.totalBeds ?? 100;
    const erBeds = h.erBeds ?? 10;
    const availableTotal = Math.max(0, Math.floor(totalBeds * ((100 - occ) / 100)));
    const availableER = Math.max(0, Math.floor(erBeds * ((100 - occ) / 100)));

    return {
      id: h.id || h._id?.toString(),
      name: h.name,
      occupancyPct: occ,
      waitMinutes: c?.waitMinutes ?? 0,
      totalBeds,
      erBeds,
      availableTotal,
      availableER
    };
  }).filter(h => h.name).sort((a, b) => b.occupancyPct - a.occupancyPct);

  return (
    <div className="civ-panel w-full sm:w-[350px] max-h-[50vh] flex flex-col pointer-events-auto mt-4 ml-4">
      <div className="civ-header !mb-3 !pb-3">
        <div>
          <h2 className="civ-header-title text-[1rem]">Network Load</h2>
          <p className="civ-header-sub text-[0.8rem]">Current hospital occupancy</p>
        </div>
      </div>
      <div className="civ-body flex flex-col gap-3 overflow-y-auto pr-2">
        {merged.map(h => (
          <div key={h.id} className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
            <div className="flex justify-between items-end">
              <span className="text-[0.75rem] font-bold text-slate-700 truncate max-w-[70%]">{h.name}</span>
              <span className="text-[0.7rem] font-medium" style={{ color: getOccupancyColor(h.occupancyPct) }}>
                {Math.round(h.occupancyPct)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out" 
                style={{
                  width: `${h.occupancyPct}%`,
                  backgroundColor: getOccupancyColor(h.occupancyPct),
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="flex gap-2">
                <div className="text-[0.65rem] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md font-semibold">
                  <span>ER: </span><span className={h.availableER < 3 ? 'text-red-500' : 'text-slate-800'}>{h.availableER}</span>
                </div>
                <div className="text-[0.65rem] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md font-semibold">
                  <span>Beds: </span><span className={h.availableTotal < 10 ? 'text-red-500' : 'text-slate-800'}>{h.availableTotal}</span>
                </div>
              </div>
              <div className="text-[0.65rem] text-slate-400 font-medium">Wait: {h.waitMinutes} m</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
