'use client';

import type { CityConfig } from '@/lib/map-3d/types';

interface CitySelectorProps {
  cities: CityConfig[];
  currentCityId: string;
  onCityChange: (city: CityConfig | null) => void;
}

export default function CitySelector({ cities, currentCityId, onCityChange }: CitySelectorProps) {
  return (
    <div className="cp-city-wrap bg-white/55 backdrop-blur-xl border border-white/80 rounded-[20px] shadow-[0_2px_14px_rgba(99,102,241,0.08)]">
      <div className="relative flex-1 min-w-0">
        <select
          value={currentCityId}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              onCityChange(null);
              return;
            }
            const city = cities.find((c) => c.id === value);
            if (city) onCityChange(city);
          }}
          className="cp-city-select"
        >
          <option value="">Choose location</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className="h-4 w-4 text-slate-500"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 8L10 13L15 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
