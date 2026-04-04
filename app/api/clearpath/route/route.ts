import { NextRequest, NextResponse } from 'next/server';
import { scoreAndRankHospitals } from '@/lib/clearpath/routingService';
import { geocodePostalCode } from '@/lib/clearpath/mapboxDirections';
import { RouteRequest } from '@/lib/clearpath/types';
import { mockHospitals } from '@/lib/clearpath/mockData';

export async function POST(req: NextRequest) {
  try {
    const body: RouteRequest = await req.json();

    // Resolve user location
    let userLat = body.userLat;
    let userLng = body.userLng;

    if ((!userLat || !userLng) && body.postalCode) {
      const geo = await geocodePostalCode(body.postalCode);
      userLat = geo.lat;
      userLng = geo.lng;
    }

    if (!userLat || !userLng) {
      return NextResponse.json(
        { error: 'Please provide location (coordinates or postal code).' },
        { status: 400 }
      );
    }

    // Try DB first, fall back to mock data
    let hospitals: any[] = [];
    let snapshots: any[] = [];

    try {
      const { getDb } = await import('@/lib/clearpath/mongoClient');
      const db = await getDb();
      const city = body.city?.toLowerCase();
      const query = city ? { city } : {};
      const dbHospitals = await db.collection('hospitals').find(query).toArray();
      if (dbHospitals.length > 0) {
        hospitals = dbHospitals;
        snapshots = await db
          .collection('congestion_snapshots')
          .find({})
          .sort({ recordedAt: -1 })
          .toArray();
      } else {
        throw new Error('Empty DB');
      }
    } catch {
      // DB unavailable — use Pune mock data
      const city = body.city?.toLowerCase() ?? 'pune';
      hospitals = mockHospitals.filter(h => h.city === city);
      if (hospitals.length === 0) hospitals = mockHospitals;
      // Generate synthetic congestion
      snapshots = hospitals.map(h => ({
        hospitalId: h.id,
        occupancyPct: 50 + Math.floor(Math.random() * 40),
        waitMinutes: 10 + Math.floor(Math.random() * 80),
        recordedAt: new Date().toISOString(),
      }));
    }

    const result = await scoreAndRankHospitals(
      userLat,
      userLng,
      body.severity,
      hospitals,
      snapshots,
      body.symptoms,
      body.predictedNeeds,
      body.imageSeverity,
      body.constraints,
    );

    if (!result) {
      return NextResponse.json(
        { error: 'No hospitals found for the specified city.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result,
      userLocation: { lat: userLat, lng: userLng },
    });
  } catch (err: any) {
    console.error('Route API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to compute route.' },
      { status: 500 }
    );
  }
}

