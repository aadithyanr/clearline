'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';

interface ActiveCasesLayerProps {
  map: mapboxgl.Map | null;
  cases: EmergencyCase[];
  onCaseSelect: (c: EmergencyCase) => void;
  selectedCaseId?: string | null;
}

export default function ActiveCasesLayer({ map, cases, onCaseSelect, selectedCaseId }: ActiveCasesLayerProps) {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    const visibleCases = selectedCaseId ? cases.filter(c => c.caseId === selectedCaseId) : cases;
    const currentIds = new Set(visibleCases.map(c => c.caseId));
    const markers = markersRef.current;

    // Remove obsolete markers
    for (const [id, marker] of markers) {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    // Add or update markers
    visibleCases.forEach(c => {
      const isSelected = c.caseId === selectedCaseId;
      const severityColor = c.triage.severity === 'critical' ? '#ef4444' : c.triage.severity === 'urgent' ? '#eab308' : '#3b82f6';
      
      let existing = markers.get(c.caseId);
      
      if (!existing) {
        const el = document.createElement('div');
        el.className = `dispatch-case-marker ${c.triage.severity === 'critical' ? 'critical-pulse' : ''}`;
        el.innerHTML = `
          <div style="
            width: 18px; 
            height: 18px; 
            border-radius: 50%; 
            background-color: ${severityColor}; 
            border: 3px solid #fff; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
            transform: ${isSelected ? 'scale(1.4)' : 'scale(1)'};
          "></div>
        `;
        
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onCaseSelect(c);
        });

        const newMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([c.userLocation.lng, c.userLocation.lat])
          .addTo(map);

        markers.set(c.caseId, newMarker);
      } else {
        // Update selection styling if needed
        const node = existing.getElement().firstElementChild as HTMLElement;
        if (node) {
          node.style.transform = isSelected ? 'scale(1.4)' : 'scale(1)';
        }
        existing.setLngLat([c.userLocation.lng, c.userLocation.lat]);
      }
    });

  }, [map, cases, selectedCaseId, onCaseSelect]);

  // CSS injected for pulsing animation
  return (
    <style jsx global>{`
      .critical-pulse > div {
        animation: criticalPulse 1.5s infinite;
      }
      @keyframes criticalPulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
    `}</style>
  );
}
