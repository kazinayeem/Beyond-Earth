import { NextRequest, NextResponse } from 'next/server';
import { getJson, ymd, daysAgo } from '@/lib/weather/nasaServer';
import { LAUNCH_SITES, type RawLaunchWeather, type SurfaceWeather } from '@/lib/weather/launchWeather';

/**
 * Launch-site weather.
 *   • NASA POWER (power.larc.nasa.gov) – hourly NASA meteorology at the pad (latest available observation).
 *     POWER is near-real-time (lags real time by hours to days), so it is a cross-check, not the only source.
 *   • Open-Meteo – real-time nowcast (wind, rain, cloud cover, thunderstorm code) used for the Go / No-Go.
 * If both fail the client falls back to a clearly-labelled offline default.
 */
interface OpenMeteo {
  current?: {
    time: string; temperature_2m: number; relative_humidity_2m: number; precipitation: number; weather_code: number;
    cloud_cover: number; pressure_msl: number; wind_speed_10m: number; wind_gusts_10m: number;
  };
}
interface PowerResp { properties?: { parameter?: Record<string, Record<string, number>> } }

const MISSING = -900;
function latest(series: Record<string, number> | undefined): { key: string; value: number } | null {
  if (!series) return null;
  const keys = Object.keys(series).sort();
  for (let i = keys.length - 1; i >= 0; i--) if (series[keys[i]] > MISSING) return { key: keys[i], value: series[keys[i]] };
  return null;
}
const powerTime = (k: string) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}T${k.slice(8, 10)}:00:00Z`;

export async function GET(req: NextRequest) {
  const siteId = (new URL(req.url).searchParams.get('site') === 'vsfb' ? 'vsfb' : 'ksc') as 'ksc' | 'vsfb';
  const site = LAUNCH_SITES[siteId];

  const compact = (d: Date) => ymd(d).replace(/-/g, '');
  const powerUrl = `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M,WS10M,PRECTOTCORR,RH2M&community=RE&longitude=${site.lon}&latitude=${site.lat}&start=${compact(daysAgo(3))}&end=${compact(new Date())}&format=JSON`;
  const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m&wind_speed_unit=ms&timezone=UTC`;

  const [power, om] = await Promise.all([getJson<PowerResp>(powerUrl, 1800), getJson<OpenMeteo>(omUrl, 300)]);

  let nasaPower: RawLaunchWeather['nasaPower'] = null;
  const p = power?.properties?.parameter;
  if (p) {
    const t = latest(p.T2M); const w = latest(p.WS10M); const r = latest(p.PRECTOTCORR); const h = latest(p.RH2M);
    const stamp = t?.key ?? w?.key ?? r?.key;
    if (stamp) nasaPower = { observedAt: powerTime(stamp), tempC: t?.value ?? null, windMs: w?.value ?? null, precipMm: r?.value ?? null, humidityPct: h?.value ?? null };
  }

  let surface: SurfaceWeather | null = null;
  if (om?.current) {
    const c = om.current;
    surface = {
      tempC: c.temperature_2m, windMs: c.wind_speed_10m, gustMs: c.wind_gusts_10m, precipMm: c.precipitation,
      cloudPct: c.cloud_cover, humidityPct: c.relative_humidity_2m, pressureHpa: c.pressure_msl,
      thunder: c.weather_code >= 95, observedAt: `${c.time}:00Z`.replace('::', ':'),
      source: nasaPower ? 'Open-Meteo real-time nowcast · cross-checked with NASA POWER' : 'Open-Meteo real-time nowcast',
    };
  } else if (nasaPower && nasaPower.windMs !== null && nasaPower.tempC !== null) {
    surface = {
      tempC: nasaPower.tempC, windMs: nasaPower.windMs, gustMs: nasaPower.windMs * 1.4, precipMm: Math.max(0, nasaPower.precipMm ?? 0),
      cloudPct: (nasaPower.precipMm ?? 0) > 0.1 ? 90 : 35, humidityPct: nasaPower.humidityPct ?? 60, pressureHpa: null,
      thunder: false, observedAt: nasaPower.observedAt, source: 'NASA POWER (latest hourly observation)',
    };
  }

  const body: RawLaunchWeather = { site, surface, nasaPower, fetchedAt: new Date().toISOString(), offline: !surface };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
