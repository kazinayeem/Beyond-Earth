'use client';

import React from 'react';
import { OctagonX } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { OPS } from '@/lib/squad/permissions';
import { crewRole } from '@/lib/network/crewRoles';

/** In-flight role actions. The server checks role, per-mission limit, progress window and budget; the Flight Director's console applies the effect. */
export function SquadOpsPanel() {
  const squad = useGameStore(s => s.squad);
  const remote = useGameStore(s => s.squadRemote);
  const progress = useGameStore(s => s.missionProgress);
  const squadDo = useGameStore(s => s.squadDo);
  const [confirmAbort, setConfirmAbort] = React.useState(false);
  if (!squad || !remote) return null;
  const spare = remote.budgetM - remote.costM - remote.reserveSpentM;
  const isCommander = squad.myRoles.includes('mission_commander');

  return (
    <div className="shrink-0 p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/25 text-xs">
      <div className="font-mono text-cyan-300 font-bold mb-1.5 flex items-center justify-between">
        <span>CREW ACTIONS</span>
        <span className="text-slate-500 font-normal">spare budget ${Math.max(0, Math.round(spare))}M</span>
      </div>
      <ul className="grid grid-cols-1 gap-1">
        {Object.values(OPS).map(op => {
          const mine = squad.myRoles.includes(op.role);
          const used = remote.ops?.[op.id] ?? 0;
          const windowOk = progress >= op.minProgress && progress <= op.maxProgress;
          const left = op.max - used;
          const ready = mine && windowOk && left > 0 && !(op.effects.spendM && spare < op.effects.spendM);
          const holders = squad.members.filter(m => m.effective.includes(op.role)).map(m => m.name.split(' ')[0]).join(', ');
          return (
            <li key={op.id} className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1 ${mine ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/10 bg-white/[0.02] opacity-70'}`}>
              <div className="min-w-0">
                <div className="truncate text-slate-100">{op.label}</div>
                <div className="truncate text-[10px] text-slate-500">{crewRole(op.role)?.short} · {mine ? 'you' : holders || 'unassigned'} · {op.max < 99 ? `${Math.max(0, left)} left` : 'unlimited'}{!windowOk ? ` · opens ${op.minProgress}–${op.maxProgress}%` : ''}</div>
              </div>
              <button type="button" disabled={!ready} title={op.hint} onClick={() => void squadDo('ops.run', { op: op.id })}
                className="shrink-0 rounded-md px-2 py-1 bg-cyan-400 text-slate-950 font-semibold disabled:bg-white/10 disabled:text-slate-500">Run</button>
            </li>
          );
        })}
      </ul>
      {isCommander && (
        <div className="mt-2">
          {!confirmAbort ? (
            <button type="button" onClick={() => setConfirmAbort(true)} className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-rose-400/40 text-rose-200 py-1.5 hover:bg-rose-400/10">
              <OctagonX className="w-3.5 h-3.5" aria-hidden /> Abort mission (Commander)
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirmAbort(false); void squadDo('mission.abort'); }} className="flex-1 rounded-lg bg-rose-500 text-white font-semibold py-1.5">Confirm abort</button>
              <button type="button" onClick={() => setConfirmAbort(false)} className="flex-1 rounded-lg border border-white/15 text-slate-300 py-1.5">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
