'use client';

import React from 'react';
import { CloudLightning, RefreshCw, Satellite, Wind } from 'lucide-react';
import { WX_SCENARIOS, type WxScenario, type WxStatus } from '@/lib/weather/launchWeather';
import type { useLaunchWeather } from '@/lib/weather/useLaunchWeather';

type Wx = ReturnType<typeof useLaunchWeather>;

export function spaceSummary(sp: NonNullable<Wx['space']>): string {
  const bits = [`${sp.activity} Sun`];
  if (sp.strongestFlare) bits.push(`strongest flare ${sp.strongestFlare}`);
  if (sp.cmeCount) bits.push(`${sp.cmeCount} CME${sp.cmeCount > 1 ? 's' : ''}`);
  if (sp.maxKp != null) bits.push(`Kp ${sp.maxKp}`);
  return bits.join(' · ');
}
export function neoSummary(n: NonNullable<Wx['neo']>): string {
  const c = n.closest ? `, closest ${n.closest.name} at ${n.closest.lunarDistances.toFixed(1)} LD` : '';
  return `${n.total} asteroids this week, ${n.hazardous} flagged hazardous${c}`;
}

const TONE: Record<WxStatus, string> = {
  GO: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  MARGINAL: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  'NO-GO': 'text-rose-300 bg-rose-400/10 border-rose-400/40',
};

/** Launch-commit weather criteria for the pad, plus the live NASA space-weather / NEO feeds. */
export function WeatherPanel({ wx, scenario, onScenario, canChangeScenario = true, className = '' }: {
  wx: Wx; scenario: WxScenario; onScenario?: (s: WxScenario) => void; canChangeScenario?: boolean; className?: string;
}) {
  const a = wx.assessment;
  return (
    <div className={`rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 p-4 text-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="hud-label flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-cyan-300" aria-hidden />Launch weather · {wx.site.short}</div>
        <span className={`px-2 py-0.5 rounded-md border font-mono text-[11px] ${TONE[a.overall]}`}>{a.overall}</span>
      </div>
      <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">{a.summary}</p>

      <ul className="mt-2.5 grid grid-cols-1 gap-1">
        {a.factors.map(f => (
          <li key={f.id} title={f.note} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
            <span className="text-xs text-slate-300">{f.label}</span>
            <span className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">{f.value}<span className="text-slate-600"> / {f.limit}</span></span>
              <span className={f.status === 'GO' ? 'text-emerald-300' : f.status === 'MARGINAL' ? 'text-amber-300' : 'text-rose-300'}>{f.status}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">Failure risk if launched now</span>
        <span className={a.failureProbability >= 0.25 ? 'text-rose-300' : a.failureProbability >= 0.08 ? 'text-amber-300' : 'text-emerald-300'}>{Math.round(a.failureProbability * 100)}%</span>
      </div>

      <div className="mt-2.5 space-y-1 text-[11px] text-slate-400">
        <div className="flex items-start gap-1.5">
          <Satellite className="w-3 h-3 mt-0.5 shrink-0 text-violet-300" aria-hidden />
          {wx.space?.available
            ? <span>NASA DONKI: {spaceSummary(wx.space)} <span className="text-slate-500">(+{wx.space.riskPts} pt cruise risk)</span></span>
            : <span>NASA DONKI space weather unavailable.</span>}
        </div>
        {wx.neo?.available && (
          <div className="flex items-start gap-1.5"><CloudLightning className="w-3 h-3 mt-0.5 shrink-0 text-amber-300" aria-hidden /><span>NASA NeoWs: {neoSummary(wx.neo)}</span></div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <select
          value={scenario}
          disabled={!canChangeScenario}
          onChange={e => onScenario?.(e.target.value as WxScenario)}
          aria-label="Weather scenario"
          className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-white/10 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-60"
        >
          {WX_SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button type="button" onClick={wx.refresh} aria-label="Refresh weather" title="Refresh" className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white">
          <RefreshCw className={`w-3.5 h-3.5 ${wx.loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="mt-1.5 text-[10px] text-slate-500 truncate" title={a.source}>{a.source}</div>
    </div>
  );
}
