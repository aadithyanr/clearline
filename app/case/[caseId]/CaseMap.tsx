'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function CaseMap({ caseData }: { caseData: EmergencyCase }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const patientMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hospitalMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const didInitialFitRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const { lat: uLat, lng: uLng } = caseData.userLocation;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [uLng, uLat],
      zoom: 12,
      pitch: 40,
    });

    mapRef.current = map;

    return () => {
      patientMarkerRef.current?.remove();
      hospitalMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      patientMarkerRef.current = null;
      hospitalMarkerRef.current = null;
      didInitialFitRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const { lat: uLat, lng: uLng } = caseData.userLocation;
    const ah = caseData.assignedHospital as any;
    const hosp = ah?.hospital;
    const routeGeometry = ah?.routeGeometry;

    const applyUpdate = () => {
      const routeData = routeGeometry
        ? { type: 'Feature', geometry: routeGeometry, properties: {} }
        : { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} };

      const existingRoute = map.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      if (!existingRoute) {
        map.addSource('route', { type: 'geojson', data: routeData as any });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ef4444', 'line-width': 4, 'line-opacity': 0.9 },
        });
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ef4444', 'line-width': 12, 'line-opacity': 0.15 },
        }, 'route-line');
      } else {
        existingRoute.setData(routeData as any);
      }

      if (!patientMarkerRef.current) {
        const userEl = document.createElement('div');
        userEl.innerHTML = `
          <div style="position:relative; width:20px; height:20px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:ping 1.5s infinite;"></div>
            <div style="position:absolute;inset:3px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>
          </div>
          <style>@keyframes ping{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}</style>
        `;
        patientMarkerRef.current = new mapboxgl.Marker({ element: userEl }).setLngLat([uLng, uLat]).addTo(map);
      } else {
        patientMarkerRef.current.setLngLat([uLng, uLat]);
      }

      if (hosp && typeof hosp.longitude === 'number' && typeof hosp.latitude === 'number') {
        if (!hospitalMarkerRef.current) {
          const hospEl = document.createElement('div');
          const hospitalName = String(hosp.name || 'Hospital');
          hospEl.innerHTML = `
            <div style="background:#ef4444;color:white;font-size:11px;font-weight:900;padding:6px 10px;border-radius:20px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 4px 16px rgba(239,68,68,0.4);white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;">
              🏥 ${hospitalName.length > 22 ? hospitalName.slice(0, 22) + '…' : hospitalName}
            </div>
          `;
          hospitalMarkerRef.current = new mapboxgl.Marker({ element: hospEl })
            .setLngLat([hosp.longitude, hosp.latitude])
            .addTo(map);
        } else {
          hospitalMarkerRef.current.setLngLat([hosp.longitude, hosp.latitude]);
        }

        if (!didInitialFitRef.current) {
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([uLng, uLat]);
          bounds.extend([hosp.longitude, hosp.latitude]);
          map.fitBounds(bounds, { padding: { top: 120, bottom: 280, left: 40, right: 40 }, maxZoom: 14 });
          didInitialFitRef.current = true;
        }
      } else if (hospitalMarkerRef.current) {
        hospitalMarkerRef.current.remove();
        hospitalMarkerRef.current = null;
      }
    };

    if (map.isStyleLoaded()) {
      applyUpdate();
    } else {
      map.once('load', applyUpdate);
    }
  }, [caseData]);

  return <div ref={containerRef} className="w-full h-full" />;
}
