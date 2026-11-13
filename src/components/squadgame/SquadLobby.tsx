'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Rocket } from 'lucide-react';
import { createSquadGameAction } from '@/app/actions/network';
import { crewRole } from '@/lib/network/crewRoles';
import { SQUAD_MIN_MEMBERS } from '@/lib/network/crewRoles';
import type { TeamEvaluation } from '@/lib/squad/teamLogic';

interface LobbyMember { id: string; name: string; leader: boolean; roles: string[]; effective: string[] }

export function SquadLobby({ squadName, mission, isLeader, memberCount, members, evaluation, lastGame }: {
  squadId: string; squadName: string; mission: { id: string; name: string; code: string; budget: number };
  isLeader: boolean; memberCount: number; members: LobbyMember[]; evaluation: TeamEvaluation; lastGame: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tooSmall = memberCount < SQUAD_MIN_MEMBERS;

  const begin = () => start(async () => {
    setError(null);
    const res = await createSquadGameAction(mission.id);
    if (!res.ok) setError(res.error); else router.refresh();
  });

  return (
    <main className="min-h-dvh bg-[#02040b] text-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/squad" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" aria-hidden />Squad</Link>
        <header>
          <div className="hud-label">{squadName} · mission room</div>
          <h1 className="font-display text-3xl text-white">{mission.name}</h1>
          <p className="mt-1 text-sm text-slate-400">{mission.code} · starting budget ${mission.budget}M. Every console plays the same mission; each crew role makes only its own decisions.</p>
        </header>

        <section className="rounded-2xl glass-panel p-5" aria-label="Crew">
          <h2 className="font-display text-lg text-white">Crew on station</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2">
            {members.map(m => (
              <li key={m.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                <div className="flex items-center justify-between"><span className="font-semibold text-slate-100">{m.name}</span>{m.leader && <span className="text-[10px] font-mono text-amber-300">LEADER</span>}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.effective.length === 0 && <span className="text-xs text-slate-500">No roles assigned</span>}
                  {m.effective.map(r => <span key={r} className={`text-[11px] px-1.5 py-0.5 rounded border ${m.roles.includes(r) ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`} title={m.roles.includes(r) ? undefined : 'Unassigned role covered by the leader'}>{crewRole(r)?.short ?? r}</span>)}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl glass-panel p-5" aria-label="Team evaluation">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-white">Team combination</h2>
            <span className="font-mono text-sm text-cyan-200">{evaluation.score}/100 · {evaluation.grade}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Bonus in flight: +{evaluation.bonus.sciencePct}% science · −{evaluation.bonus.riskPts} risk points. Change roles on the squad page.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {evaluation.warnings.slice(0, 5).map((w, i) => <li key={i} className={w.level === 'bad' ? 'text-rose-300' : w.level === 'warn' ? 'text-amber-300' : 'text-slate-400'}>• {w.text}</li>)}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          {isLeader ? (
            <button type="button" onClick={begin} disabled={pending || tooSmall} className="cta-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">
              <Rocket className="w-4 h-4" aria-hidden />{pending ? 'Opening room…' : 'Start squad mission'}
            </button>
          ) : (
            <p className="text-sm text-slate-400">Waiting for your squad leader to open the mission room. This page updates when you refresh.</p>
          )}
          {lastGame && <Link href={`?game=${lastGame.id}`} className="cta-ghost rounded-xl px-5 py-3 text-sm text-slate-200">View last debrief ({lastGame.status})</Link>}
          {!isLeader && <button type="button" onClick={() => router.refresh()} className="cta-ghost rounded-xl px-5 py-3 text-sm text-slate-200">Refresh</button>}
        </div>
        {tooSmall && <p className="text-sm text-amber-300">A squad mission needs at least {SQUAD_MIN_MEMBERS} crew members.</p>}
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      </div>
    </main>
  );
}
