import { NextResponse } from 'next/server';
import { REAL_NASA_MISSIONS } from '@/data/nasa/missions/missionProfiles';

export async function GET() {
  return NextResponse.json(REAL_NASA_MISSIONS, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      'X-NASA-Data-Source': 'NASA_PDS',
      'X-Real-Data-Verified': 'true'
    }
  });
}
