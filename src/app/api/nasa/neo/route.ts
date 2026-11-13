import { NextResponse } from 'next/server';
import { NASA_API_KEY, NASA_KEY_MODE, getJson, ymd } from '@/lib/weather/nasaServer';
import type { NeoSummary } from '@/lib/weather/launchWeather';

/** Near-Earth objects approaching today (NASA NeoWs, api.nasa.gov). Used by the Asteroid Surveyor briefing and risk model. */
interface NeoObj {
  name: string;
  is_potentially_hazardous_asteroid: boolean;
  estimated_diameter?: { meters?: { estimated_diameter_max?: number } };
  close_approach_data?: { close_approach_date: string; miss_distance?: { lunar?: string } }[];
}
interface NeoFeed { element_count?: number; near_earth_objects?: Record<string, NeoObj[]> }

export async function GET() {
  const today = ymd(new Date());
  const feed = await getJson<NeoFeed>(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`, 3600);
  const objs = Object.values(feed?.near_earth_objects ?? {}).flat();
  let closest: NeoSummary['closest'] = null;
  for (const o of objs) {
    const ca = o.close_approach_data?.[0];
    const ld = ca?.miss_distance?.lunar ? parseFloat(ca.miss_distance.lunar) : NaN;
    if (!Number.isNaN(ld) && (!closest || ld < closest.lunarDistances)) {
      closest = { name: o.name.replace(/[()]/g, '').trim(), lunarDistances: ld, date: ca?.close_approach_date ?? today, diameterM: Math.round(o.estimated_diameter?.meters?.estimated_diameter_max ?? 0) };
    }
  }
  const hazardous = objs.filter(o => o.is_potentially_hazardous_asteroid).length;
  const body: NeoSummary & { available: boolean; keyMode: string } = {
    total: feed?.element_count ?? objs.length, hazardous, closest, fetchedAt: new Date().toISOString(),
    riskPts: Math.min(3, hazardous), available: feed !== null, keyMode: NASA_KEY_MODE,
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } });
}
