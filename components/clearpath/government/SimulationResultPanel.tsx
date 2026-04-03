'use client';

interface SimulationResultPanelProps {
  result: {
    before: Record<string, number>;
    after: Record<string, number>;
    delta: Record<string, number>;
    proposedAfter?: Record<string, number>;
  };
  hospitals: any[];
  proposedLabels?: Record<string, string>;
}

export default function SimulationResultPanel({ result, hospitals, proposedLabels = {} }: SimulationResultPanelProps) {
  const hospitalMap: Record<string, string> = {};
  for (const h of hospitals) {
    hospitalMap[(h._id ?? h.id)?.toString()] = h.name;
  }

  const rows = Object.keys(result.before).map((id) => ({
    id,
    name: hospitalMap[id] ?? id,
    before: result.before[id],
    after: result.after[id],
    delta: result.delta[id],
  }));

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_rgba(99,102,241,0.08)] rounded-[20px] p-5 space-y-4">
      <div className="flex items-center gap-3 border-b border-indigo-100 pb-3">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <h3 className="text-[13px] font-bold text-slate-800 tracking-wide">
          Simulation Results Report
        </h3>
      </div>
      <div className="border border-white/90 bg-white/80 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-indigo-50/50 border-b border-indigo-100">
              <th className="text-left px-3 py-2.5 font-bold text-slate-600 tracking-wide">Hospital</th>
              <th className="text-right px-2 py-2.5 font-bold text-slate-600 tracking-wide">Before</th>
              <th className="text-right px-2 py-2.5 font-bold text-slate-600 tracking-wide">After</th>
              <th className="text-right px-3 py-2.5 font-bold text-indigo-600 tracking-wide">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                <td className="px-3 py-2.5 font-bold text-slate-800 truncate max-w-[120px]">{row.name}</td>
                <td className="text-right px-2 py-2.5 text-slate-500 font-medium">{parseFloat(row.before.toFixed(1))}%</td>
                <td className="text-right px-2 py-2.5 text-slate-800 font-bold">{parseFloat(row.after.toFixed(1))}%</td>
                <td className={`text-right px-3 py-2.5 font-bold ${row.delta < 0 ? 'text-emerald-600' : row.delta > 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                  {row.delta > 0 ? '+' : ''}{parseFloat(row.delta.toFixed(1))}%
                </td>
              </tr>
            ))}
            {(() => {
              const proposed = result.proposedAfter ?? (result.after?.['proposed'] !== undefined ? { proposed: result.after['proposed'] } : {});
              return Object.entries(proposed).map(([key, occ]) => (
                <tr key={key} className="bg-indigo-50/50 border-t border-indigo-100">
                  <td className="px-3 py-2.5 font-bold text-indigo-700">{proposedLabels[key] ?? `Proposed Asset ${key.replace('proposed-', '#')}`}</td>
                  <td className="text-right px-2 py-2.5 text-slate-400">—</td>
                  <td className="text-right px-2 py-2.5 font-bold text-indigo-700">{occ}%</td>
                  <td className="text-right px-3 py-2.5">
                    <span className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md font-bold uppercase tracking-wide">NEW</span>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
