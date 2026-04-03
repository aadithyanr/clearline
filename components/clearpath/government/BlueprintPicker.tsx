'use client';

import { PRESET_BLUEPRINTS, type Blueprint } from '@/lib/clearpath/blueprints';

interface BlueprintPickerProps {
  selected: Blueprint | null;
  onSelect: (blueprint: Blueprint) => void;
  onRemoveCustom?: (blueprint: Blueprint) => void;
  customBlueprints?: Blueprint[];
}

function BlueprintCard({ bp, isActive, onSelect, onRemove, badge }: { bp: Blueprint; isActive: boolean; onSelect: () => void; onRemove?: () => void; badge?: string }) {
  return (
    <div
      className={`w-full text-left p-4 border transition-all duration-200 cursor-pointer flex flex-col gap-2 rounded-[16px] ${isActive
        ? 'border-indigo-400 bg-indigo-50 text-indigo-900 shadow-[0_4px_12px_rgba(99,102,241,0.15)] ring-1 ring-indigo-400'
        : 'border-white bg-white/60 hover:bg-white hover:shadow-sm text-slate-700'
        }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className={`text-[13px] font-bold tracking-wide ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
            {bp.name}
          </span>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-800 text-white'}`}>
              {badge}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${isActive ? 'bg-indigo-100/80 text-indigo-800' : 'bg-slate-100/80 text-slate-600'
            }`}>
            {bp.beds} beds
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className={`text-[11px] font-bold px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors`}
              title="Remove custom building"
            >
              Remove
            </button>
          )}
        </span>
      </div>
      <p className={`text-[11px] font-medium leading-relaxed mt-1 ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>
        {bp.description}
      </p>
    </div>
  );
}

export default function BlueprintPicker({ selected, onSelect, onRemoveCustom, customBlueprints = [] }: BlueprintPickerProps) {
  return (
    <div className="space-y-2">
      {customBlueprints.map((bp) => (
        <BlueprintCard
          key={bp.id}
          bp={bp}
          isActive={selected?.id === bp.id}
          onSelect={() => onSelect(bp)}
          onRemove={onRemoveCustom ? () => onRemoveCustom(bp) : undefined}
          badge="Custom"
        />
      ))}
      {customBlueprints.length > 0 && PRESET_BLUEPRINTS.length > 0 && (
        <div className="flex items-center gap-2 py-3">
          <div className="flex-1 h-px bg-indigo-100" />
          <span className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-wider px-2">Presets</span>
          <div className="flex-1 h-px bg-indigo-100" />
        </div>
      )}
      {PRESET_BLUEPRINTS.map((bp) => (
        <BlueprintCard
          key={bp.id}
          bp={bp}
          isActive={selected?.id === bp.id}
          onSelect={() => onSelect(bp)}
        />
      ))}
    </div>
  );
}

