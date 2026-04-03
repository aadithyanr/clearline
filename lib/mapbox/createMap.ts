import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export interface CreateMapOptions {
  container: HTMLDivElement;
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** When false, do not add the global composite "3d-buildings" layer. Default true. */
  addGlobalBuildings?: boolean;
  /** Mapbox style URL. Default: dark-v11. */
  style?: string;
  /** When false, do not add the traffic layer. Default true. */
  showTraffic?: boolean;
}

/**
 * Returns the first symbol layer id in the current style, for inserting layers below labels.
 */
export function getFirstSymbolLayerId(map: mapboxgl.Map): string | undefined {
  const layers = map.getStyle().layers;
  return layers?.find(
    (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
  )?.id;
}

/** Layer id patterns for street/road labels - hide these to remove street names. */
const STREET_LABEL_PATTERN = /(road|street).*label|label.*(road|street)/i;

/** Layer id patterns for minor roads - hide these to show only major roads. */
const MINOR_ROAD_PATTERN = /road-(street|minor|link)(-|$)/i;

/**
 * Hides street-name labels and minor road layers so only major roads remain visible.
 * Call after map style has loaded.
 */
function hideStreetNamesAndMinorRoads(map: mapboxgl.Map): void {
  const layers = map.getStyle().layers;
  if (!layers) return;
  for (const layer of layers) {
    const id = layer.id;
    if (STREET_LABEL_PATTERN.test(id)) {
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch {
        // Layer might not support layout or already removed
      }
    }
    if (MINOR_ROAD_PATTERN.test(id)) {
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch {
        // Ignore if layer doesn't support layout visibility
      }
    }
  }
}

/**
 * Creates a Mapbox map with optional global 3D buildings layer, navigation controls,
 * and map.resize() after load. Used by ClearPathMap.
 * When addGlobalBuildings is false, only the base map is shown; custom extrusion
 * layers (hospital footprints, landmarks) are added by layer components.
 */
export function createMapboxMap(options: CreateMapOptions): mapboxgl.Map {
  const {
    container,
    center,
    zoom,
    pitch = 45,
    bearing = -17.6,
    addGlobalBuildings = true,
    showTraffic = true,
    style = 'mapbox://styles/mapbox/dark-v11',
  } = options;

  const map = new mapboxgl.Map({
    container,
    style,
    center,
    zoom,
    pitch,
    bearing,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  map.on('load', () => {
    hideStreetNamesAndMinorRoads(map);

    // Add 3D terrain for realistic elevation
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

    // ── Traffic layer ────────────────────────────────────────────
    if (showTraffic) {
      if (!map.getSource('mapbox-traffic')) {
        map.addSource('mapbox-traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1',
        });
      }

      const labelLayerId = getFirstSymbolLayerId(map);

      map.addLayer(
        {
          id: 'traffic',
          type: 'line',
          source: 'mapbox-traffic',
          'source-layer': 'traffic',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 1.5,
              14, 3,
              18, 5,
            ],
            'line-color': [
              'match',
              ['get', 'congestion'],
              'low', '#00c853',  // green
              'moderate', '#FFD600',  // yellow
              'heavy', '#FF6D00',  // orange
              'severe', '#D50000',  // red
              '#00c853'               // default
            ],
            'line-opacity': 0.85,
          },
        },
        labelLayerId  // insert below map labels so text stays visible
      );
    }
    // ────────────────────────────────────────────────────────────

    if (addGlobalBuildings) {
      const labelLayerId = getFirstSymbolLayerId(map);
      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );
    }
    map.resize();
  });

  return map;
}