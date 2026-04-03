'use client';

interface DayNightToggleProps {
  theme: 'night' | 'day' | 'satellite';
  onChange: (theme: 'night' | 'day' | 'satellite') => void;
}

export default function DayNightToggle({ theme, onChange }: DayNightToggleProps) {
  const options = [
    { key: 'night', label: 'Night' },
    { key: 'day',   label: 'Day'   },
    { key: 'satellite', label: 'Sat' },
  ] as const;

  return (
    <div
      role="group"
      aria-label="Map style"
      className="flex items-center gap-0.5 rounded-full px-1 py-1
                 bg-white/60 backdrop-blur-xl
                 border border-white/80
                 shadow-[0_2px_12px_rgba(99,102,241,0.10)]"
    >
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={`Switch to ${key} mode`}
          className={`
            px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
            ${theme === key
              ? 'bg-white text-indigo-600 shadow-[0_1px_6px_rgba(99,102,241,0.22)]'
              : 'text-slate-400 hover:text-slate-600'}
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}