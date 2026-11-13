'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { assessWeather, siteForMission, type NeoSummary, type RawLaunchWeather, type SpaceWeather, type WxScenario } from './launchWeather';

type SpaceResp = SpaceWeather & { available: boolean; keyMode: string };
type NeoResp = NeoSummary & { available: boolean; keyMode: string };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Live launch-site weather + NASA space weather (+ NASA NEO feed for the asteroid mission). Refreshes every 5 minutes. */
export function useLaunchWeather(missionId: string, scenario: WxScenario = 'live') {
  const site = useMemo(() => siteForMission(missionId), [missionId]);
  const [raw, setRaw] = useState<RawLaunchWeather | null>(null);
  const [space, setSpace] = useState<SpaceResp | null>(null);
  const [neo, setNeo] = useState<NeoResp | null>(null);
  const [tick, setTick] = useState(0);
  const fetchKey = `${site.id}|${missionId}|${tick}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== fetchKey;

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [w, s, n] = await Promise.all([
        getJson<RawLaunchWeather>(`/api/nasa/weather?site=${site.id}`),
        getJson<SpaceResp>('/api/nasa/space-weather'),
        missionId === 'mission-03' ? getJson<NeoResp>('/api/nasa/neo') : Promise.resolve(null),
      ]);
      if (!alive) return;
      setRaw(w); setSpace(s); setNeo(n); setLoadedKey(`${site.id}|${missionId}|${tick}`);
    })();
    return () => { alive = false; };
  }, [site.id, missionId, tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const assessment = useMemo(() => assessWeather(raw, scenario), [raw, scenario]);

  /** Extra starting risk (percentage points) from live space weather + near-Earth objects, depending on the destination. */
  const liveRiskPts = useMemo(() => {
    const target = missionId === 'mission-04' ? 0.5 : 1; // Earth orbit sits inside the magnetosphere
    const sp = (space?.available ? space.riskPts : 0) * target;
    const ne = missionId === 'mission-03' && neo?.available ? neo.riskPts : 0;
    return Math.round(sp + ne);
  }, [space, neo, missionId]);

  return { site, raw, space, neo, assessment, loading, refresh, liveRiskPts };
}
