'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function CaseMap({ caseData }: { caseData: EmergencyCase }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { lat: uLat, lng: uLng } = caseData.userLocation;
    const hosp = caseData.assignedHospital?.hospital;
    const routeGeometry = caseData.assignedHospital?.routeGeometry;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      // navigation-night-v1 requests the legacy incidents tileset that returns 404 for some tokens.
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [uLng, uLat],
      zoom: 12,
      pitch: 40,
    });

    map.on('load', () => {
      // Draw route geometry if available
      if (routeGeometry) {
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: routeGeometry, properties: {} } });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ef4444', 'line-width': 4, 'line-opacity': 0.9 },
        });
        // Glow
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ef4444', 'line-width': 12, 'line-opacity': 0.15 },
        }, 'route-line');
      }

      // Patient marker — pulsing
      const userEl = document.createElement('div');
      userEl.innerHTML = `
        <div style="position:relative; width:20px; height:20px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:ping 1.5s infinite;"></div>
          <div style="position:absolute;inset:3px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>
        </div>
        <style>@keyframes ping{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}</style>
      `;
      new mapboxgl.Marker({ element: userEl }).setLngLat([uLng, uLat]).addTo(map);

      // Hospital marker
      if (hosp) {
        const hospEl = document.createElement('div');
        hospEl.innerHTML = `
          <div style="background:#ef4444;color:white;font-size:11px;font-weight:900;padding:6px 10px;border-radius:20px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 4px 16px rgba(239,68,68,0.4);white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;">
            🏥 ${hosp.name.length > 22 ? hosp.name.slice(0, 22) + '…' : hosp.name}
          </div>
        `;
        new mapboxgl.Marker({ element: hospEl })
          .setLngLat([hosp.longitude, hosp.latitude])
          .addTo(map);
      }

      // Fit bounds to show both markers
      if (hosp) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([uLng, uLat]);
        bounds.extend([hosp.longitude, hosp.latitude]);
        map.fitBounds(bounds, { padding: { top: 120, bottom: 280, left: 40, right: 40 }, maxZoom: 14 });
      }
    });

    return () => map.remove();
  }, [caseData]);

  return <div ref={containerRef} className="w-full h-full" />;
}
