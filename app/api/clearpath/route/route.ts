import { NextRequest, NextResponse } from 'next/server';
import { scoreAndRankHospitals } from '@/lib/clearpath/routingService';
import { geocodePostalCode } from '@/lib/clearpath/mapboxDirections';
import { getDb } from '@/lib/clearpath/mongoClient';
import { RouteRequest } from '@/lib/clearpath/types';

export async function POST(req: NextRequest) {
  try {
    const body: RouteRequest = await req.json();
    const db = await getDb();

    // Resolve user location from coordinates or postal code
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

    const hospitals = await db
      .collection('hospitals')
      .find({})
      .toArray();
    const snapshots = await db
      .collection('congestion_snapshots')
      .find({})
      .sort({ recordedAt: -1 })
      .toArray();

    const result = await scoreAndRankHospitals(
      userLat,
      userLng,
      body.severity,
      hospitals,
      snapshots,
      body.symptoms
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
