import { NextRequest, NextResponse } from 'next/server';
import { congestionService } from '@/lib/clearpath/congestionService';

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') || undefined;
  try {
    const data = await congestionService.getCongestion(city);
    return NextResponse.json(data);
  } catch (e) {
    console.warn('Congestion API: DB unavailable', e);
    return NextResponse.json([]);
  }
}
