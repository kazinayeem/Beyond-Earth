import { NextResponse } from 'next/server';
import { NASA_API_KEY, NASA_KEY_MODE, getJson, ymd, daysAgo } from '@/lib/weather/nasaServer';
import type { SpaceWeather } from '@/lib/weather/launchWeather';

/** Live space weather from NASA DONKI (api.nasa.gov): solar flares, CMEs and geomagnetic storms of the last 7 days. */
interface Flr { classType?: string; peakTime?: string; beginTime?: string }
interface Cme { activityID?: string }
interface Gst { allKpIndex?: { kpIndex: number }[] }

const flareRank = (c: string) => {
  const m = /^([ABCMX])(\d+(\.\d+)?)/i.exec(c);
  if (!m) return 0;
  return 'ABCMX'.indexOf(m[1].toUpperCase()) * 100 + parseFloat(m[2]);
};

export async function GET() {
  const start = ymd(daysAgo(7)); const end = ymd(new Date());
  const q = `startDate=${start}&endDate=${end}&api_key=${NASA_API_KEY}`;
  const [flr, cme, gst] = await Promise.all([
    getJson<Flr[]>(`https://api.nasa.gov/DONKI/FLR?${q}`, 900),
    getJson<Cme[]>(`https://api.nasa.gov/DONKI/CME?${q}`, 900),
    getJson<Gst[]>(`https://api.nasa.gov/DONKI/GST?${q}`, 900),
  ]);
  const flares = (Array.isArray(flr) ? flr : [])
    .filter(f => f.classType)
    .map(f => ({ classType: f.classType as string, peakTime: f.peakTime ?? f.beginTime ?? '' }))
    .sort((a, b) => flareRank(b.classType) - flareRank(a.classType));
  const strongest = flares[0]?.classType ?? null;
  const maxKp = (Array.isArray(gst) ? gst : []).flatMap(g => g.allKpIndex ?? []).reduce<number | null>((m, k) => (m === null || k.kpIndex > m ? k.kpIndex : m), null);
  const cmeCount = Array.isArray(cme) ? cme.length : 0;
  const xClass = flares.some(f => f.classType.toUpperCase().startsWith('X'));
  const mClass = flares.some(f => f.classType.toUpperCase().startsWith('M'));
  const activity: SpaceWeather['activity'] = xClass || (maxKp ?? 0) >= 6 ? 'storm' : mClass || (maxKp ?? 0) >= 5 || cmeCount >= 4 ? 'active' : 'quiet';
  const body: SpaceWeather & { available: boolean; keyMode: string } = {
    flares: flares.slice(0, 5), cmeCount, maxKp, strongestFlare: strongest, activity,
    riskPts: activity === 'storm' ? 6 : activity === 'active' ? 3 : 0,
    fetchedAt: new Date().toISOString(),
    available: flr !== null || cme !== null || gst !== null,
    keyMode: NASA_KEY_MODE,
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
}
