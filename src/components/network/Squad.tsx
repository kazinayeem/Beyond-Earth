'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, UserPlus, LogOut, UserMinus, Rocket, Check, X, Loader2, Users, Plus, Clock, Shield, DoorOpen, Radio } from 'lucide-react';
import {
  createGroupAction, respondInvitationAction, cancelInvitationAction, leaveGroupAction, removeMemberAction,
  transferLeadershipAction,
} from '@/app/actions/network';
import { CREW_ROLE_IDS, SQUAD_MAX_MEMBERS, SQUAD_MIN_MEMBERS, crewRole } from '@/lib/network/crewRoles';
import { effectiveRoles } from '@/lib/squad/permissions';
import { CrewPlanner } from './CrewPlanner';
import { RoleChips, RoleInfoButton } from './RoleInfo';
import { MISSIONS } from '@/data/missions';
import { AVATAR_COLORS, AVATAR_SHAPES } from '@/lib/network/avatars';
import type { getSquadDashboard, InvitationRow } from '@/lib/network/queries';
import { sounds } from '@/lib/sound';
import { useAuth } from './AuthProvider';
import { PlayerAvatar } from './PlayerAvatar';
import { Notice, StatTile } from './ui';

type Dash = NonNullable<Awaited<ReturnType<typeof getSquadDashboard>>>;
type FullDash = Extract<Dash, { members: unknown }>;

const SPECS = [
  { id: null, label: 'Any' }, { id: 'MOON', label: 'Lunar' }, { id: 'MARS', label: 'Mars' },
  { id: 'NEO', label: 'Asteroids' }, { id: 'EO', label: 'Earth orbit' }, { id: 'DEEP', label: 'Deep space' },
] as const;

function useAction() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) { onOk?.(); await refresh(); router.refresh(); }
      else { setError(res.error ?? 'Request failed.'); sounds.playWarning(); }
    });
  return { pending, error, run };
}

const timeLeft = (iso: string) => {
  const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3.6e6));
  return h >= 48 ? `${Math.round(h / 24)} days left` : `${h} h left`;
};

export function ReceivedInvites({ invites }: { invites: InvitationRow[] }) {
  const { pending, error, run } = useAction();
  if (!invites.length) return null;
  return (
    <section className="rounded-2xl glass-panel p-5" aria-label="Squad invitations">
      <h2 className="font-display text-lg text-white mb-3">Invitations</h2>
      {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <ul className="space-y-2">
        {invites.map(inv => (
          <li key={inv.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <PlayerAvatar avatar={inv.group?.emblem} size={40} />
            <div className="flex-1 min-w-0">
              <div className="text-white">{inv.group?.name} <span className="text-xs font-mono text-slate-500">{inv.group?.group_code}</span></div>
              <div className="text-xs text-slate-400">Invited by {inv.inviter?.display_name} as <span className="text-cyan-200">{crewRole(inv.crew_role).label}</span> · {timeLeft(inv.expires_at)}</div>
            </div>
            <button type="button" disabled={pending} onClick={() => run(() => respondInvitationAction(inv.id, true), () => sounds.playMilestone())}
              className="cta-primary rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-950 inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> Join</button>
            <button type="button" disabled={pending} onClick={() => run(() => respondInvitationAction(inv.id, false))}
              className="cta-ghost rounded-lg px-3 py-1.5 text-sm text-slate-300 inline-flex items-center gap-1.5"><X className="w-4 h-4" /> Decline</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CreateSquad() {
  const { pending, error, run } = useAction();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emblem, setEmblem] = useState('planet-violet');
  const [spec, setSpec] = useState<string | null>(null);
  return (
    <section className="rounded-2xl glass-panel p-5 sm:p-6" aria-label="Create a squad">
      <h2 className="font-display text-xl text-white">Form a squad</h2>
      <p className="text-sm text-slate-400 mt-1 mb-5">Squads hold 2–4 pilots. You lead the squad you create and can invite others once it exists.</p>
      <form className="grid md:grid-cols-2 gap-5" onSubmit={e => { e.preventDefault(); run(() => createGroupAction({ name, description, emblem, specialization: spec }), () => sounds.playSystemOn()); }}>
        <div className="space-y-4">
          <div>
            <label htmlFor="sq-name" className="block text-[13px] text-slate-300 mb-1.5">Squad name</label>
            <input id="sq-name" className="input-field" required minLength={3} maxLength={32} value={name} onChange={e => setName(e.target.value)} placeholder="Red Horizon" />
          </div>
          <div>
            <label htmlFor="sq-desc" className="block text-[13px] text-slate-300 mb-1.5">Description <span className="text-slate-500">(optional)</span></label>
            <textarea id="sq-desc" className="input-field min-h-[80px]" maxLength={200} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does your squad fly?" />
          </div>
          <fieldset>
            <legend className="text-[13px] text-slate-300 mb-1.5">Specialization</legend>
            <div className="flex flex-wrap gap-1.5">
              {SPECS.map(s => (
                <button key={s.label} type="button" aria-pressed={spec === s.id} onClick={() => setSpec(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${spec === s.id ? 'bg-cyan-300 text-slate-950' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'}`}>{s.label}</button>
              ))}
            </div>
          </fieldset>
        </div>
        <div>
          <div className="text-[13px] text-slate-300 mb-2">Emblem</div>
          <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Squad emblem">
            {AVATAR_SHAPES.flatMap(sh => AVATAR_COLORS.slice(0, 3).map(c => `${sh}-${c}`)).map(e => (
              <button key={e} type="button" role="radio" aria-checked={emblem === e} aria-label={e} onClick={() => setEmblem(e)}
                className={`rounded-xl p-1 ${emblem === e ? 'bg-cyan-400/20 ring-1 ring-cyan-300' : 'hover:bg-white/[0.06]'}`}>
                <PlayerAvatar avatar={e} size={30} />
              </button>
            ))}
          </div>
          {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
          <button type="submit" disabled={pending || name.trim().length < 3}
            className="cta-primary mt-5 w-full rounded-xl py-3 text-sm font-semibold text-slate-950 inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create squad
          </button>
        </div>
      </form>
    </section>
  );
}

export function SquadDashboard({ d }: { d: FullDash }) {
  const { pending, error, run } = useAction();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const g = d.group;
  const isLeader = g.owner_id === d.uid;
  const slots = Array.from({ length: SQUAD_MAX_MEMBERS }, (_, i) => d.members[i] ?? null);
  const nameOf = (id: string) => d.members.find(m => m.player_id === id)?.profile.display_name ?? 'Former member';
  const missionName = (id: string) => MISSIONS.find(m => m.id === id)?.name ?? id;
  const enough = d.members.length >= SQUAD_MIN_MEMBERS;

  return (
    <div className="space-y-5">
      {/* Squad header */}
      <section className="rounded-3xl glass-panel p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute -left-20 -bottom-24 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center">
          <PlayerAvatar avatar={g.emblem} size={84} ring />
          <div className="flex-1 min-w-0">
            <div className="hud-label text-violet-300/80">Squad{g.specialization ? ` · ${g.specialization}` : ''}</div>
            <h1 className="font-display text-3xl font-semibold text-white truncate">{g.name}</h1>
            <div className="mt-1 font-mono text-sm text-cyan-300">{g.group_code}</div>
            {g.description && <p className="mt-2 text-sm text-slate-300 max-w-xl">{g.description}</p>}
          </div>
          <div className="text-right">
            <div className="hud-label">Squad ranking</div>
            <div className="font-display text-4xl text-white">{d.leaderboardRank ? `#${d.leaderboardRank}` : '—'}</div>
          </div>
        </div>
      </section>

      <section aria-label="Squad statistics" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Science points" value={g.science_total.toLocaleString()} accent="text-violet-200" />
        <StatTile label="Mission XP" value={g.xp_total.toLocaleString()} accent="text-cyan-200" />
        <StatTile label="Squad credits" value={g.credits.toLocaleString()} accent="text-emerald-200" sub="Earned on squad missions" />
        <StatTile label="Missions completed" value={g.missions_completed} />
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      {/* Crew slots (up to 4) */}
      <section aria-label="Crew">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg text-white">Crew <span className="text-slate-500 text-sm">{d.members.length}/{SQUAD_MAX_MEMBERS}</span></h2>
          {d.members.length < SQUAD_MAX_MEMBERS && <Link href="/players" className="cta-secondary rounded-xl px-3.5 py-2 text-sm text-cyan-100 inline-flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite pilot</Link>}
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {slots.map((m, i) => {
            if (!m) {
              return (
                <li key={`empty-${i}`} className="rounded-2xl border border-dashed border-white/15 p-5 flex flex-col items-center justify-center text-center min-h-[250px]">
                  <div className="w-[72px] h-[72px] rounded-full border border-dashed border-white/20 flex items-center justify-center text-slate-500"><Users className="w-6 h-6" /></div>
                  <div className="mt-3 text-sm text-slate-400">{i < SQUAD_MIN_MEMBERS ? 'Needed for missions' : 'Open seat'}</div>
                  <Link href="/players" className="mt-2 text-xs text-cyan-300 hover:text-cyan-100">Find a pilot</Link>
                </li>
              );
            }
            const eff = [...effectiveRoles(m.player_id, d.members, CREW_ROLE_IDS)];
            const covering = m.role === 'leader' ? eff.filter(r => !m.crew_roles.includes(r)) : [];
            const mine = m.player_id === d.uid;
            return (
              <li key={m.player_id} className="crew-slot rounded-2xl p-5 flex flex-col items-center text-center">
                <PlayerAvatar avatar={m.profile.avatar} size={72} ring={m.role === 'leader'} />
                <div className="mt-3 flex items-center gap-1.5 text-white font-medium">
                  {m.role === 'leader' && <Crown className="w-4 h-4 text-amber-300" aria-label="Leader" />}{m.profile.display_name}{mine && <span className="text-[10px] text-cyan-300">(you)</span>}
                </div>
                <Link href={`/players/${m.profile.player_code}`} className="text-xs font-mono text-slate-400 hover:text-cyan-200">{m.profile.player_code}</Link>

                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{eff.length} role{eff.length === 1 ? '' : 's'}</span>
                  <RoleInfoButton roleIds={eff} title={`${m.profile.display_name} · ${eff.length} role${eff.length === 1 ? '' : 's'}`} label={`Role details for ${m.profile.display_name}`} />
                </div>
                <RoleChips roleIds={m.crew_roles} covering={covering} max={3} />

                <div className="mt-3 grid grid-cols-2 gap-2 w-full text-center">
                  <div className="rounded-lg bg-white/[0.04] py-1.5"><div className="text-[10px] uppercase text-slate-500">Science</div><div className="font-mono text-sm">{m.stats?.science_total ?? '—'}</div></div>
                  <div className="rounded-lg bg-white/[0.04] py-1.5"><div className="text-[10px] uppercase text-slate-500">Missions</div><div className="font-mono text-sm">{m.stats?.missions_completed ?? '—'}</div></div>
                </div>
                {isLeader && !mine && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    <button type="button" disabled={pending} onClick={() => run(() => transferLeadershipAction(m.player_id))} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 inline-flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Make leader</button>
                    <button type="button" disabled={pending} onClick={() => run(() => removeMemberAction(m.player_id))} className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 inline-flex items-center gap-1"><UserMinus className="w-3.5 h-3.5" /> Remove</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <CrewPlanner key={d.members.map(m => `${m.player_id}:${m.crew_roles.join('.')}`).join('|')} members={d.members} uid={d.uid} isLeader={isLeader} />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Mission rooms */}
        <section className="rounded-2xl glass-panel p-5" aria-label="Squad mission rooms">
          <h2 className="font-display text-lg text-white">Squad mission rooms</h2>
          <p className="text-sm text-slate-400 mt-1">
            The whole squad flies <em>one</em> mission together in a shared room. Each crew member only controls the jobs of their own roles, and the live squad chat is always open.
            {!enough && <span className="text-amber-200"> You need at least {SQUAD_MIN_MEMBERS} crew members to start.</span>}
          </p>
          <ul className="mt-3 space-y-2">
            {MISSIONS.map(m => {
              const active = d.games.find(x => x.mission_id === m.id && x.status === 'active');
              const done = d.games.find(x => x.mission_id === m.id && x.status === 'completed');
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                  <Rocket className="w-4 h-4 text-cyan-300" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{m.name} <span className="text-[11px] text-slate-500">· {m.difficulty}</span></div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      {active ? <span className="inline-flex items-center gap-1 text-emerald-300"><Radio className="w-3 h-3 animate-pulse" /> Live · {(active.stage ?? 'briefing').replace('_', ' ')}</span>
                        : done ? <span>Last flight complete</span> : <span>No room open</span>}
                    </div>
                  </div>
                  <Link href={`/squad/${g.id}/${m.id}`} className={`rounded-lg px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${active ? 'cta-primary text-slate-950 font-semibold' : 'cta-secondary text-cyan-100'}`}>
                    <DoorOpen className="w-4 h-4" /> {active ? 'Join room' : isLeader ? 'Open room' : 'View room'}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Pending invitations sent */}
        <section className="rounded-2xl glass-panel p-5" aria-label="Pending invitations">
          <h2 className="font-display text-lg text-white">Pending invitations</h2>
          <ul className="mt-3 space-y-2">
            {d.sentInvites.length === 0 && <li className="text-sm text-slate-500">No invitations waiting for a reply.</li>}
            {d.sentInvites.map(inv => (
              <li key={inv.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                <PlayerAvatar avatar={inv.invitee?.avatar} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{inv.invitee?.display_name}</div>
                  <div className="text-xs text-slate-500">{crewRole(inv.crew_role).label} · {timeLeft(inv.expires_at)}</div>
                </div>
                <button type="button" disabled={pending} onClick={() => run(() => cancelInvitationAction(inv.id))} className="text-xs text-slate-400 hover:text-rose-200">Withdraw</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Squad mission history */}
      <section className="rounded-2xl glass-panel p-5" aria-label="Squad mission history">
        <h2 className="font-display text-lg text-white mb-3">Squad mission log</h2>
        {d.results.length === 0 ? <p className="text-sm text-slate-500">Results from squad missions appear here.</p> : (
          <ul className="divide-y divide-white/[0.05]">
            {d.results.map(r => (
              <li key={r.id} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-white w-40 truncate">{nameOf(r.player_id)}</span>
                <span className="text-slate-300 flex-1">{missionName(r.mission_id)}</span>
                <span className={`font-mono text-xs ${r.status === 'SUCCESS' ? 'text-emerald-300' : r.status === 'PARTIAL' ? 'text-amber-300' : 'text-rose-300'}`}>{r.status}</span>
                <span className="font-mono text-xs text-slate-400 w-20 text-right">score {r.score}</span>
                <span className="font-mono text-xs text-emerald-200 w-24 text-right">+{(r.credits_awarded + r.squad_bonus).toLocaleString()} CR</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex justify-end">
        {confirmLeave ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-300">{isLeader && d.members.length > 1 ? 'Leadership passes to the longest-serving member.' : d.members.length === 1 ? 'You are the last member — the squad will be dissolved.' : 'Leave this squad?'}</span>
            <button type="button" disabled={pending} onClick={() => run(() => leaveGroupAction())} className="rounded-lg px-3 py-1.5 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30">Confirm</button>
            <button type="button" onClick={() => setConfirmLeave(false)} className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-white/[0.06]">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmLeave(true)} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-rose-200"><LogOut className="w-4 h-4" /> Leave squad</button>
        )}
      </div>
    </div>
  );
}
