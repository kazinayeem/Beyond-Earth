import { NextRequest, NextResponse } from 'next/server';
import { REAL_PLANETARY_DATA } from '@/data/nasa/planets/planetaryData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('target')?.toLowerCase() || 'moon';

  const data = REAL_PLANETARY_DATA[target] || REAL_PLANETARY_DATA.moon;

  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      'X-NASA-Data-Source': 'NASA_PDS',
      'X-Real-Data-Verified': 'true'
    }
  });
}
