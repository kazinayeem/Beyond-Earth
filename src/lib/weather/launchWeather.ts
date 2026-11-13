/**
 * Launch weather model.
 *
 * Live inputs come from our server routes (NASA POWER, NASA DONKI, Open-Meteo —
 * see src/app/api/nasa/*). This file turns raw readings into Launch-Commit-
 * Criteria-style GO / MARGINAL / NO-GO factors and a failure probability.
 *
 * GAME MODEL: thresholds are inspired by public launch-commit criteria (wind,
 * precipitation, thunderstorms, thick cloud, temperature) but simplified; they
 * are not flight rules.
 */

export type WxStatus = 'GO' | 'MARGINAL' | 'NO-GO';

export interface LaunchSite { id: 'ksc' | 'vsfb'; name: string; short: string; lat: number; lon: number }
export const LAUNCH_SITES: Record<LaunchSite['id'], LaunchSite> = {
  ksc: { id: 'ksc', name: 'Kennedy Space Center, Florida', short: 'KSC LC-39A', lat: 28.5729, lon: -80.649 },
  vsfb: { id: 'vsfb', name: 'Vandenberg SFB, California', short: 'VSFB SLC-4E', lat: 34.742, lon: -120.5724 },
};
/** Polar / sun-synchronous orbits launch from Vandenberg, everything else from Florida */
export const siteForMission = (missionId: string): LaunchSite => (missionId === 'mission-04' ? LAUNCH_SITES.vsfb : LAUNCH_SITES.ksc);

export interface SurfaceWeather {
  tempC: number;
  windMs: number;
  gustMs: number;
  precipMm: number; // mm per hour
  cloudPct: number;
  humidityPct: number;
  pressureHpa: number | null;
  thunder: boolean;
  observedAt: string;
  source: string; // human-readable provenance
}
export interface SpaceWeather {
  flares: { classType: string; peakTime: string }[];
  cmeCount: number;
  maxKp: number | null;
  strongestFlare: string | null;
  activity: 'quiet' | 'active' | 'storm';
  /** Added to the flight's starting risk (percentage points) */
  riskPts: number;
  fetchedAt: string;
}
export interface NeoSummary {
  total: number;
  hazardous: number;
  closest: { name: string; lunarDistances: number; date: string; diameterM: number } | null;
  fetchedAt: string;
  riskPts: number;
}
export interface RawLaunchWeather {
  site: LaunchSite;
  surface: SurfaceWeather | null;
  nasaPower: { observedAt: string; tempC: number | null; windMs: number | null; precipMm: number | null; humidityPct: number | null } | null;
  fetchedAt: string;
  offline: boolean;
}

export interface WxFactor {
  id: string;
  label: string;
  value: string;
  limit: string;
  status: WxStatus;
  note: string;
  /** Probability that this factor alone destroys the vehicle if launched anyway */
  failP: number;
}
export interface WxVisual { rain: number; cloud: number; wind: number; lightning: number; fog: number; storm: boolean }
export interface WeatherAssessment {
  overall: WxStatus;
  failureProbability: number;
  factors: WxFactor[];
  visual: WxVisual;
  summary: string;
  /** most likely cause shown in the debrief if the vehicle is lost */
  cause: string;
  scenario: WxScenario;
  source: string;
  observedAt: string;
}

export type WxScenario = 'live' | 'clear' | 'windy' | 'rain' | 'storm';
export const WX_SCENARIOS: { id: WxScenario; label: string; hint: string }[] = [
  { id: 'live', label: 'Live (NASA / real-time)', hint: 'Real conditions at the pad right now' },
  { id: 'clear', label: 'Training: clear sky', hint: 'Perfect launch day' },
  { id: 'windy', label: 'Training: high winds', hint: 'Upper-level wind shear' },
  { id: 'rain', label: 'Training: heavy rain', hint: 'Precipitation + thick cloud' },
  { id: 'storm', label: 'Training: thunderstorm', hint: 'Lightning, rain and gusts' },
];

const SCENARIO_SURFACE: Record<Exclude<WxScenario, 'live'>, Omit<SurfaceWeather, 'observedAt' | 'source'>> = {
  clear: { tempC: 24, windMs: 3, gustMs: 5, precipMm: 0, cloudPct: 12, humidityPct: 55, pressureHpa: 1017, thunder: false },
  windy: { tempC: 19, windMs: 15, gustMs: 23, precipMm: 0, cloudPct: 45, humidityPct: 60, pressureHpa: 1004, thunder: false },
  rain: { tempC: 17, windMs: 9, gustMs: 14, precipMm: 4.5, cloudPct: 97, humidityPct: 94, pressureHpa: 1001, thunder: false },
  storm: { tempC: 26, windMs: 17, gustMs: 29, precipMm: 11, cloudPct: 100, humidityPct: 97, pressureHpa: 994, thunder: true },
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function rate(value: number, marginal: number, nogo: number): WxStatus {
  return value >= nogo ? 'NO-GO' : value >= marginal ? 'MARGINAL' : 'GO';
}

export function assessWeather(raw: RawLaunchWeather | null, scenario: WxScenario = 'live'): WeatherAssessment {
  const now = new Date().toISOString();
  let w: SurfaceWeather;
  let source: string;
  if (scenario !== 'live') {
    w = { ...SCENARIO_SURFACE[scenario], observedAt: now, source: 'Training scenario' };
    source = 'Training scenario (not live data)';
  } else if (raw?.surface) {
    w = raw.surface;
    source = raw.surface.source;
  } else {
    w = { ...SCENARIO_SURFACE.clear, observedAt: now, source: 'Offline default' };
    source = 'Offline default (live feed unavailable)';
  }

  const gustEq = Math.max(w.windMs, w.gustMs * 0.75);
  const factors: WxFactor[] = [];
  const push = (f: Omit<WxFactor, 'failP'> & { failP?: [number, number] }) => {
    const [pm, pn] = f.failP ?? [0.04, 0.4];
    factors.push({ ...f, failP: f.status === 'GO' ? 0 : f.status === 'MARGINAL' ? pm : pn });
  };

  push({
    id: 'wind', label: 'Winds aloft', value: `${w.windMs.toFixed(1)} m/s (gust ${w.gustMs.toFixed(0)})`, limit: 'GO < 10 · NO-GO ≥ 15.5 m/s',
    status: rate(gustEq, 10, 15.5), note: 'High winds load the vehicle at Max-Q and can break guidance.', failP: [0.06, 0.5],
  });
  push({
    id: 'precip', label: 'Precipitation', value: `${w.precipMm.toFixed(1)} mm/h`, limit: 'GO = 0 · NO-GO ≥ 1 mm/h',
    status: w.precipMm >= 1 ? 'NO-GO' : w.precipMm > 0.05 ? 'MARGINAL' : 'GO', note: 'Rain and hail damage thermal protection and can trigger lightning.', failP: [0.05, 0.35],
  });
  push({
    id: 'lightning', label: 'Lightning / thunderstorms', value: w.thunder ? 'Active storm cell' : 'None reported', limit: 'Any storm cell = NO-GO',
    status: w.thunder ? 'NO-GO' : 'GO', note: 'A rocket exhaust plume can trigger a lightning strike (Apollo 12).', failP: [0, 0.6],
  });
  push({
    id: 'cloud', label: 'Cloud cover', value: `${Math.round(w.cloudPct)} %`, limit: 'MARGINAL ≥ 85 %',
    status: w.cloudPct >= 98 && w.precipMm > 0.05 ? 'NO-GO' : w.cloudPct >= 85 ? 'MARGINAL' : 'GO', note: 'Thick clouds hide the vehicle from tracking cameras and carry electric charge.', failP: [0.03, 0.25],
  });
  push({
    id: 'temp', label: 'Temperature', value: `${w.tempC.toFixed(1)} °C`, limit: 'GO 4–35 °C',
    status: w.tempC < 0 || w.tempC > 38 ? 'NO-GO' : w.tempC < 4 || w.tempC > 35 ? 'MARGINAL' : 'GO', note: 'Cold stiffens seals (Challenger); heat stresses cryogenic tanks.', failP: [0.04, 0.4],
  });

  const survive = factors.reduce((p, f) => p * (1 - f.failP), 1);
  const baseline = 0.012; // an ordinary launch is never 100 %
  const failureProbability = clamp(1 - survive * (1 - baseline), baseline, 0.97);
  const overall: WxStatus = factors.some(f => f.status === 'NO-GO') ? 'NO-GO' : factors.some(f => f.status === 'MARGINAL') ? 'MARGINAL' : 'GO';

  const worst = [...factors].sort((a, b) => b.failP - a.failP)[0];
  const cause = worst && worst.failP > 0
    ? ({ wind: 'structural failure from wind shear at Max-Q', precip: 'rain damage to thermal protection and avionics', lightning: 'lightning strike on the exhaust plume', cloud: 'loss of tracking in thick cloud', temp: 'seal and tank failure in extreme temperature' } as Record<string, string>)[worst.id]
    : 'launch vehicle anomaly';
  const bad = factors.filter(f => f.status !== 'GO').map(f => f.label.toLowerCase());
  const summary = overall === 'GO' ? 'All weather criteria are within limits.'
    : overall === 'MARGINAL' ? `Marginal: ${bad.join(', ')}. Launch is possible but risk is raised.`
      : `NO-GO: ${bad.join(', ')}. Launching now is very likely to lose the vehicle.`;

  const visual: WxVisual = {
    rain: clamp(w.precipMm / 6, 0, 1),
    cloud: clamp(w.cloudPct / 100, 0, 1),
    wind: clamp(w.windMs / 18, 0, 1),
    lightning: w.thunder ? 1 : 0,
    fog: clamp((w.humidityPct - 88) / 12, 0, 1) * (w.windMs < 4 ? 1 : 0.4),
    storm: w.thunder,
  };
  return { overall, failureProbability, factors, visual, summary, cause, scenario, source, observedAt: w.observedAt };
}

// ── Seeded randomness so every crew member sees the same outcome ─────────────
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LaunchOutcome { outcome: 'nominal' | 'failure'; failAtT: number | null; cause: string | null }
/** Decide whether the vehicle is lost. `rand` is any 0..1 generator (Math.random solo, seeded in a squad). */
export function rollLaunchOutcome(a: Pick<WeatherAssessment, 'failureProbability' | 'cause'>, rand: () => number): LaunchOutcome {
  const lost = a.failureProbability >= 0.9 || rand() < a.failureProbability;
  if (!lost) return { outcome: 'nominal', failAtT: null, cause: null };
  // failures cluster around max-Q (T+55…85 s) but can happen any time in the first stage burn
  const failAtT = Math.round(18 + rand() * 120);
  return { outcome: 'failure', failAtT, cause: a.cause };
}
