import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/clearpath/mongoClient';
import { mockHospitals } from '@/lib/clearpath/mockData';

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city');
  try {
    const db = await getDb();
    const query = city ? { city: city.toLowerCase() } : {};
    const hospitals = await db.collection('hospitals')
      .find(query)
      .toArray();
    if (hospitals.length > 0) return NextResponse.json(hospitals);
    // DB connected but empty — fall through to mock
    throw new Error('Empty collection');
  } catch (e) {
    console.warn('Hospitals API: DB unavailable, using mock data');
    const filtered = city
      ? mockHospitals.filter(h => h.city === city.toLowerCase())
      : mockHospitals;
    return NextResponse.json(filtered);
  }
}
