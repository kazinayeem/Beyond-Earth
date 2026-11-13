'use client';

import React from 'react';
import { OctagonAlert, Rocket, ShieldCheck, ThumbsDown, ThumbsUp, Undo2 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { WeatherAssessment } from '@/lib/weather/launchWeather';

/** Launch-day station split: Flight Director calls GO/NO-GO, Risk Manager waives a weather NO-GO, Flight Controller presses the button. */
export function SquadLaunchPanel({ assessment, pollDone }: { assessment: WeatherAssessment; pollDone: boolean }) {
  const squad = useGameStore(s => s.squad);
  const launch = useGameStore(s => s.squadRemote?.launch);
  const squadDo = useGameStore(s => s.squadDo);
  if (!squad || !launch) return null;

  const has = (r: string) => squad.myRoles.includes(r);
  const who = (r: string) => squad.members.filter(m => m.effective.includes(r)).map(m => m.name.split(' ')[0]).join(', ') || 'nobody';
  const phase = launch.phase;
  const noGoWx = assessment.overall === 'NO-GO';
  const btn = 'w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Launch status</span>
          <span className={`font-mono font-bold ${phase === 'go' ? 'text-emerald-300' : phase === 'nogo' ? 'text-rose-300' : 'text-slate-300'}`}>
            {phase === 'go' ? 'GO' : phase === 'nogo' ? 'NO-GO' : phase === 'counting' ? 'COUNTING' : 'AWAITING FLIGHT DIRECTOR'}
          </span>
        </div>
        {phase === 'go' && launch.goBy && <div className="mt-1 text-slate-400">Declared by {launch.goBy} · weather {launch.wx?.overall} · {Math.round((launch.wx?.p ?? 0) * 100)}% loss risk</div>}
        {launch.waiver && <div className="mt-1 text-amber-300 flex items-center gap-1"><ShieldCheck className="w-3 h-3" aria-hidden />Weather waiver granted — risk accepted</div>}
      </div>

      {/* Flight Director */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!has('flight_director') || !pollDone || phase === 'counting'} className={`${btn} bg-emerald-400 text-slate-950 hover:bg-emerald-300`}
          title={has('flight_director') ? undefined : `Flight Director: ${who('flight_director')}`}
          onClick={() => void squadDo('launch.go', { go: true, wx: { overall: assessment.overall, p: assessment.failureProbability, cause: assessment.cause, summary: assessment.summary } })}>
          <ThumbsUp className="w-4 h-4" aria-hidden /> GO
        </button>
        <button type="button" disabled={!has('flight_director') || phase === 'counting'} className={`${btn} bg-rose-500/90 text-white hover:bg-rose-400`}
          onClick={() => void squadDo('launch.go', { go: false })}>
          <ThumbsDown className="w-4 h-4" aria-hidden /> NO-GO
        </button>
      </div>
      {!has('flight_director') && <p className="text-[11px] text-slate-500">Flight Director ({who('flight_director')}) calls GO / NO-GO.</p>}

      {/* Risk Manager waiver */}
      {(noGoWx || launch.waiver) && (
        <button type="button" disabled={!has('risk_manager') || phase === 'counting'} onClick={() => void squadDo('launch.waiver', { granted: !launch.waiver })}
          className={`${btn} border ${launch.waiver ? 'border-amber-400/50 text-amber-200' : 'border-rose-400/40 text-rose-200'} bg-transparent`}>
          <OctagonAlert className="w-4 h-4" aria-hidden /> {launch.waiver ? 'Withdraw weather waiver' : 'Grant weather waiver (accept risk)'}
          {!has('risk_manager') && <span className="text-[10px] opacity-70">· Risk Manager: {who('risk_manager')}</span>}
        </button>
      )}

      {/* Flight Controller */}
      <button type="button" disabled={!has('flight_controller') || phase !== 'go'} onClick={() => void squadDo('launch.commit')}
        className={`${btn} bg-cyan-400 text-slate-950 hover:bg-cyan-300 enabled:shadow-[0_0_24px_rgba(34,211,238,0.35)]`}>
        <Rocket className="w-4 h-4" aria-hidden /> LAUNCH
        {!has('flight_controller') && <span className="text-[10px] opacity-70">· Flight Controller: {who('flight_controller')}</span>}
      </button>
      {phase === 'go' && (has('flight_controller') || has('flight_director')) && (
        <button type="button" onClick={() => void squadDo('launch.scrub')} className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <Undo2 className="w-3 h-3" aria-hidden /> Scrub / hold
        </button>
      )}
    </div>
  );
}
