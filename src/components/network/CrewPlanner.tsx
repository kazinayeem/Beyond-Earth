'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, RotateCcw, Save, Loader2, AlertTriangle, CheckCircle2, Info as InfoIcon, ShieldCheck } from 'lucide-react';
import { CREW_ROLES, CREW_ROLE_GROUPS, crewRole, SQUAD_MIN_MEMBERS, type CrewRoleGroup } from '@/lib/network/crewRoles';
import { evaluateTeam, suggestAssignment, CRITICAL_ROLE_NOTES, type Assignment } from '@/lib/squad/teamLogic';
import { setCrewRolesAction } from '@/app/actions/network';
import type { Member } from '@/lib/network/queries';
import { sounds } from '@/lib/sound';
import { RoleInfoButton } from './RoleInfo';
import { Notice } from './ui';

const toAssignment = (members: Member[]): Assignment => Object.fromEntries(members.map(m => [m.player_id, [...m.crew_roles]]));
const sameAssignment = (a: Assignment, b: Assignment) =>
  Object.keys(a).every(k => [...(a[k] ?? [])].sort().join() === [...(b[k] ?? [])].sort().join());

/**
 * Crew Planner — the leader decides who holds which of the 20 roles (a member can hold many).
 * Shows the team score, the cohesion bonus it earns in the simulation, and why each critical role matters.
 */
export function CrewPlanner({ members, isLeader }: { members: Member[]; uid: string; isLeader: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const saved = useMemo(() => toAssignment(members), [members]);
  const [draft, setDraft] = useState<Assignment>(saved);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const ids = members.map(m => m.player_id);
  const leader = members.find(m => m.role === 'leader')?.player_id ?? ids[0];
  const nameOf = (id: string) => members.find(m => m.player_id === id)?.profile.display_name ?? '—';
  const ownerOf = (role: string) => ids.find(id => draft[id]?.includes(role)) ?? '';
  const evalr = useMemo(() => evaluateTeam(draft, ids, leader), [draft, ids, leader]);
  const dirty = !sameAssignment(saved, draft) || !sameAssignment(draft, saved);

  const assign = (role: string, playerId: string) => {
    setOkMsg(null);
    setDraft(prev => {
      const next: Assignment = Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.filter(r => r !== role)]));
      if (playerId) next[playerId] = [...(next[playerId] ?? []), role];
      return next;
    });
  };
  const auto = () => { sounds.playToggle(); setOkMsg(null); setDraft(suggestAssignment(ids, leader)); };
  const reset = () => { setOkMsg(null); setDraft(saved); };
  const save = () => start(async () => {
    setError(null); setOkMsg(null);
    const res = await setCrewRolesAction(draft);
    if (res.ok) { sounds.playMilestone(); setOkMsg('Crew plan saved. Every member can now see their roles.'); router.refresh(); }
    else { setError(res.error); sounds.playWarning(); }
  });

  const groups = Object.keys(CREW_ROLE_GROUPS) as CrewRoleGroup[];
  const scoreColor = evalr.score >= 90 ? 'text-emerald-300' : evalr.score >= 75 ? 'text-cyan-300' : evalr.score >= 55 ? 'text-amber-300' : 'text-rose-300';
  const barColor = evalr.score >= 90 ? 'bg-emerald-400' : evalr.score >= 75 ? 'bg-cyan-400' : evalr.score >= 55 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <section className="rounded-2xl glass-panel p-5" aria-label="Crew planner">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-white">Crew planner</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            The mission has <strong className="text-slate-200">{CREW_ROLES.length} roles</strong> but a squad has at most 4 pilots, so one pilot holds several.
            Each role has exactly one owner and only the owner can do that job in the mission room.
            {isLeader ? ' Roles nobody holds fall back to you, the leader.' : ' Only the squad leader can change the plan.'}
          </p>
        </div>
        {isLeader && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={auto} disabled={pending} className="cta-secondary rounded-xl px-3.5 py-2 text-sm text-cyan-100 inline-flex items-center gap-2"><Sparkles className="w-4 h-4" /> Auto-assign best combination</button>
            <button type="button" onClick={reset} disabled={pending || !dirty} className="cta-ghost rounded-xl px-3 py-2 text-sm text-slate-300 inline-flex items-center gap-2 disabled:opacity-40"><RotateCcw className="w-4 h-4" /> Reset</button>
            <button type="button" onClick={save} disabled={pending || !dirty} className="cta-primary rounded-xl px-4 py-2 text-sm font-semibold text-slate-950 inline-flex items-center gap-2 disabled:opacity-50">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save crew plan
            </button>
          </div>
        )}
      </div>

      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {okMsg && <div className="mt-3"><Notice>{okMsg}</Notice></div>}

      <div className="mt-4 grid lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Role table */}
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <h3 className="text-sm font-medium text-white">{CREW_ROLE_GROUPS[g].label}</h3>
                <span className="text-[11px] text-slate-500">{CREW_ROLE_GROUPS[g].blurb}</span>
              </div>
              <ul className="rounded-xl border border-white/[0.07] divide-y divide-white/[0.05] overflow-hidden">
                {CREW_ROLES.filter(r => r.group === g).map(r => {
                  const Icon = r.icon;
                  const owner = ownerOf(r.id);
                  return (
                    <li key={r.id} className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.02]">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.tier === 1 ? 'bg-amber-300' : r.tier === 2 ? 'bg-cyan-300' : 'bg-slate-500'}`} title={r.tier === 1 ? 'Mission-critical' : r.tier === 2 ? 'Subsystem owner' : 'Support'} />
                      <Icon className="w-4 h-4 text-cyan-300 shrink-0" aria-hidden />
                      <span className="flex-1 min-w-0 text-sm text-slate-100 truncate">{r.label}</span>
                      <RoleInfoButton roleIds={[r.id]} label={`About the ${r.label} role`} />
                      <label className="sr-only" htmlFor={`own-${r.id}`}>Owner of {r.label}</label>
                      <select id={`own-${r.id}`} value={owner} disabled={!isLeader || pending} onChange={e => assign(r.id, e.target.value)}
                        className="rounded-lg bg-slate-900/80 border border-white/10 text-xs text-slate-100 px-2 py-1.5 outline-none focus:border-cyan-400/60 max-w-[9.5rem] disabled:opacity-80">
                        <option value="">Unassigned → leader</option>
                        {members.map(m => <option key={m.player_id} value={m.player_id}>{m.profile.display_name}</option>)}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Evaluation */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="hud-label">Team score</div>
                <div className={`font-display text-4xl ${scoreColor}`}>{evalr.score}<span className="text-base text-slate-500">/100</span></div>
              </div>
              <div className={`text-sm font-medium ${scoreColor}`}>{evalr.grade}</div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${evalr.score}%` }} /></div>
            <div className="mt-3 text-xs text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden />
              <span>
                In-flight cohesion bonus: <strong className="text-white">{evalr.bonus.sciencePct >= 0 ? '+' : ''}{evalr.bonus.sciencePct}% science</strong> and <strong className="text-white">{evalr.bonus.riskPts >= 0 ? '−' : '+'}{Math.abs(evalr.bonus.riskPts)} risk points</strong>.
                A well-balanced crew flies better.
              </span>
            </div>
            {members.length < SQUAD_MIN_MEMBERS && <div className="mt-3"><Notice tone="error">A squad mission needs at least {SQUAD_MIN_MEMBERS} pilots.</Notice></div>}
          </div>

          <ul className="space-y-1.5">
            {evalr.warnings.map((w, i) => (
              <li key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${w.level === 'bad' ? 'bg-rose-500/10 text-rose-200' : w.level === 'warn' ? 'bg-amber-400/10 text-amber-100' : 'bg-cyan-400/[0.07] text-cyan-100'}`}>
                {w.level === 'info' ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : w.level === 'warn' ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <InfoIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                <span>{w.text}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-white/[0.08] p-4">
            <div className="hud-label mb-2">Roles the flight cannot do without</div>
            <ul className="space-y-2">
              {CRITICAL_ROLE_NOTES.map(n => {
                const owner = ownerOf(n.id);
                return (
                  <li key={n.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-100">{crewRole(n.id).label}</span>
                      <span className={owner ? 'text-emerald-300' : 'text-amber-300'}>{owner ? nameOf(owner) : `${nameOf(leader)} (default)`}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">{n.why}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
