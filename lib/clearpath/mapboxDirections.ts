const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export interface DirectionsResult {
  drivingTimeMinutes: number;
  distanceKm: number;
  routeGeometry: any; // GeoJSON LineString
  congestionSegments?: string[]; // per-leg congestion levels
}

export async function getDrivingDirections(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number
): Promise<DirectionsResult> {
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?access_token=${MAPBOX_TOKEN}` +
    `&geometries=geojson` +
    `&overview=full` +
    `&annotations=congestion,duration`;

  const res = await fetch(url);
  if (!res.ok) {
    // Fallback to straight-line estimate
    const dist = haversineKm(originLat, originLng, destLat, destLng);
    return {
      drivingTimeMinutes: (dist / 40) * 60, // assume 40 km/h average
      distanceKm: dist,
      routeGeometry: {
        type: 'LineString',
        coordinates: [
          [originLng, originLat],
          [destLng, destLat],
        ],
      },
    };
  }

  const data: any = await res.json();
  const route = data.routes[0];

  return {
    drivingTimeMinutes: route.duration / 60,
    distanceKm: route.distance / 1000,
    routeGeometry: route.geometry,
    congestionSegments: route.legs?.[0]?.annotation?.congestion,
  };
}

export async function getBatchDirections(
  originLng: number,
  originLat: number,
  destinations: Array<{ lng: number; lat: number; id: string }>
): Promise<Map<string, DirectionsResult>> {
  const results = new Map<string, DirectionsResult>();
  const promises = destinations.map(async (dest) => {
    const result = await getDrivingDirections(originLng, originLat, dest.lng, dest.lat);
    results.set(dest.id, result);
  });
  await Promise.all(promises);
  return results;
}

export async function geocodePostalCode(
  postalCode: string
): Promise<{ lat: number; lng: number }> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postalCode)}.json` +
    `?country=ca&types=postcode&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  const data: any = await res.json();

  if (!data.features?.length) {
    throw new Error(`Could not geocode postal code: ${postalCode}`);
  }

  const [lng, lat] = data.features[0].center;
  return { lat, lng };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
