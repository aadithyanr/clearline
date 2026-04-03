'use client';

import { motion } from 'framer-motion';

interface ModeToggleProps {
  mode: 'government' | 'civilian';
  onChange: (mode: 'government' | 'civilian') => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white/55 backdrop-blur-xl border border-white/80 rounded-full shadow-[0_2px_14px_rgba(99,102,241,0.08)] w-full">
      {(['government', 'civilian'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`relative flex-1 px-4 py-2 text-sm font-semibold transition-all rounded-full ${
            mode === m ? 'text-white' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {mode === m && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-md rounded-full"
              layoutId="mode-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{m === 'government' ? 'Government' : 'Civilian'}</span>
        </button>
      ))}
    </div>
  );
}
