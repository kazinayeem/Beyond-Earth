'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, Users, Wallet } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { crewRole } from '@/lib/network/crewRoles';
import { RoleInfoButton } from '@/components/network/RoleInfo';
import { SQUAD_STAGES, type SquadStage } from '@/lib/squad/permissions';

const STAGE_LABEL: Record<SquadStage, string> = {
  briefing: 'Briefing', builder: 'Build', launcher_trajectory: 'Rocket & route', launch: 'Launch', mission_control: 'Flight', debrief: 'Debrief',
};

/** What each role does at each stage — drives the "your station" list. */
const STAGE_DUTIES: Record<SquadStage, { role: string; text: string }[]> = {
  briefing: [
    { role: 'mission_director', text: 'Set the budget cap' },
    { role: 'mission_commander', text: 'Approve the mission plan (Begin mission design)' },
  ],
  builder: [
    { role: 'mission_director', text: 'Adjust the budget' },
    { role: 'mechanical_engineer', text: 'Structure modules' },
    { role: 'electrical_engineer', text: 'Power modules' },
    { role: 'propulsion_engineer', text: 'Propulsion modules' },
    { role: 'thermal_engineer', text: 'Thermal modules' },
    { role: 'communication_officer', text: 'Communication modules' },
    { role: 'navigation_officer', text: 'Navigation modules' },
    { role: 'science_officer', text: 'Cameras' },
    { role: 'research_scientist', text: 'Science instruments' },
    { role: 'planetary_scientist', text: 'NASA flight instruments' },
    { role: 'aerospace_engineer', text: 'Freeze the build (Proceed)' },
  ],
  launcher_trajectory: [
    { role: 'aerospace_engineer', text: 'Choose the launch vehicle' },
    { role: 'mission_planner', text: 'Choose the trajectory' },
    { role: 'mission_director', text: 'Adjust the budget' },
    { role: 'mission_commander', text: 'Authorise the launch campaign' },
  ],
  launch: [
    { role: 'flight_director', text: 'Weather poll → declare GO / NO-GO' },
    { role: 'risk_manager', text: 'Grant a weather waiver (only if NO-GO)' },
    { role: 'flight_controller', text: 'Press LAUNCH' },
  ],
  mission_control: [
    { role: 'flight_director', text: 'Runs the simulation · controls speed' },
    { role: 'mission_commander', text: 'Can order a mission abort' },
    { role: 'risk_manager', text: 'Radiation events · risk review' },
    { role: 'navigation_officer', text: 'Trajectory events · course correction' },
    { role: 'communication_officer', text: 'Comm events' },
    { role: 'electrical_engineer', text: 'Power events' },
    { role: 'planetary_scientist', text: 'Discovery events' },
    { role: 'mechanical_engineer', text: 'Hardware events' },
    { role: 'mission_director', text: 'Contingency spend' },
    { role: 'project_manager', text: 'Milestone reviews' },
    { role: 'data_scientist', text: 'Data-fusion analysis' },
    { role: 'robotics_engineer', text: 'Deploy arm / sampler' },
    { role: 'software_engineer', text: 'Flight-software patch' },
  ],
  debrief: [],
};

export function SquadHud() {
  const squad = useGameStore(s => s.squad);
  const remote = useGameStore(s => s.squadRemote);
  const notice = useGameStore(s => s.squadNotice);
  const setNotice = useGameStore(s => s.setSquadNotice);
  const squadDo = useGameStore(s => s.squadDo);
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(id);
  }, [notice, setNotice]);
  useEffect(() => { if (remote) setBudget(remote.budgetM); }, [remote?.budgetM]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!squad || !remote) return null;
  const stage = remote.stage;
  const duties = STAGE_DUTIES[stage];
  const holders = (role: string) => squad.members.filter(m => m.effective.includes(role));
  const canBudget = squad.myRoles.includes('mission_director') && (stage === 'briefing' || stage === 'builder' || stage === 'launcher_trajectory');
  const lo = Math.round(remote.baseBudgetM * 0.7), hi = Math.round(remote.baseBudgetM * 1.3);
  const spent = remote.costM + remote.reserveSpentM;

  return (
    <div className="relative z-30 shrink-0 border-b border-cyan-400/20 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-cyan-200 font-mono">
          <Users className="w-3.5 h-3.5" aria-hidden />
          <span className="truncate max-w-[10rem]">{squad.groupName}</span>
        </div>
        <ol className="hidden md:flex items-center gap-1 font-mono text-[10px]" aria-label="Mission stages">
          {SQUAD_STAGES.map((s, i) => {
            const idx = SQUAD_STAGES.indexOf(stage);
            return <li key={s} className={`px-1.5 py-0.5 rounded ${i === idx ? 'bg-cyan-400 text-slate-950' : i < idx ? 'text-emerald-300' : 'text-slate-500'}`}>{STAGE_LABEL[s]}</li>;
          })}
        </ol>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-mono">You:</span>
          {squad.myRoles.length === 0 && <span className="text-slate-400">observer</span>}
          {squad.myRoles.slice(0, 4).map(r => <span key={r} className="px-1.5 py-0.5 rounded bg-cyan-400/15 text-cyan-100 border border-cyan-400/25">{crewRole(r)?.short ?? r}</span>)}
          {squad.myRoles.length > 4 && <span className="text-slate-400">+{squad.myRoles.length - 4}</span>}
          <RoleInfoButton roleIds={squad.myRoles} title="Your roles" />
        </div>
        <div className="flex items-center gap-1 font-mono text-slate-300 ml-auto">
          <Wallet className="w-3.5 h-3.5 text-emerald-300" aria-hidden />
          <span>Budget ${remote.budgetM}M</span>
          {spent > 0 && <span className="text-slate-500">· committed ${Math.round(spent)}M</span>}
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex items-center gap-1 text-slate-300 hover:text-white">
          Stations {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {canBudget && budget !== null && (
        <div className="mx-auto max-w-7xl px-3 pb-1.5 flex items-center gap-3 text-xs">
          <span className="text-emerald-300 font-mono">Director · budget cap</span>
          <input type="range" min={lo} max={hi} step={5} value={budget} onChange={e => setBudget(Number(e.target.value))}
            aria-label="Budget cap in millions of dollars" className="flex-1 max-w-xs accent-emerald-400" />
          <span className="font-mono text-slate-200 w-16">${budget}M</span>
          <button type="button" disabled={budget === remote.budgetM} onClick={() => void squadDo('budget.adjust', { budgetM: budget })}
            className="rounded-md px-2.5 py-1 bg-emerald-400 text-slate-950 font-semibold disabled:opacity-40">Set</button>
          <span className="text-slate-500 hidden sm:inline">±30% of ${remote.baseBudgetM}M</span>
        </div>
      )}

      {open && (
        <div className="mx-auto max-w-7xl px-3 pb-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5 text-xs">
          {duties.map(d => {
            const hs = holders(d.role);
            const mine = squad.myRoles.includes(d.role);
            return (
              <div key={d.role + d.text} className={`rounded-lg border px-2.5 py-1.5 ${mine ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{crewRole(d.role)?.label ?? d.role}</span>
                  <span className={mine ? 'text-cyan-200' : 'text-slate-400'}>{mine ? 'YOU' : hs.map(h => h.name.split(' ')[0]).join(', ') || '—'}</span>
                </div>
                <div className="text-slate-400">{d.text}</div>
              </div>
            );
          })}
          {duties.length === 0 && <div className="text-slate-400">Mission complete — see the debrief.</div>}
        </div>
      )}

      {notice && (
        <div role="alert" className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40 max-w-[92vw] flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-900/95 px-4 py-2.5 text-sm text-amber-100 shadow-xl">
          <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" aria-hidden />{notice}
        </div>
      )}
    </div>
  );
}
