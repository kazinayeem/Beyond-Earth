import React from 'react';
import Link from 'next/link';
import {
  Rocket, Moon, Orbit, Sparkles, Globe, Wrench, FlaskConical, Users, Lock, ShieldCheck, Calendar,
} from 'lucide-react';
import { MISSIONS } from '@/data/missions';
import { rankProgress } from '@/lib/network/avatars';
import type { getPlayerDossier } from '@/lib/network/queries';
import { PlayerAvatar } from './PlayerAvatar';
import { CopyCode } from './CopyCode';
import { StatTile } from './ui';

const ACH_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket, Moon, Orbit, Sparkles, Globe, Wrench, FlaskConical, Users,
};
const missionName = (id: string) => MISSIONS.find(m => m.id === id)?.name ?? id;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type Dossier = NonNullable<Awaited<ReturnType<typeof getPlayerDossier>>>;

export function PlayerDossier({ d, editor }: { d: Dossier; editor?: React.ReactNode }) {
  const { profile, stats } = d;
  const xp = stats?.xp ?? 0;
  const rp = rankProgress(xp);
  return (
    <div className="space-y-5">
      <section className="rounded-3xl glass-panel p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center">
          <PlayerAvatar avatar={profile.avatar} size={96} ring />
          <div className="flex-1 min-w-0">
            <div className="hud-label text-cyan-300/80">{stats ? rp.rank : 'Pilot'}</div>
            <h1 className="font-display text-3xl font-semibold text-white truncate">{profile.display_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span>@{profile.username}</span>
              <CopyCode code={profile.player_code} />
              <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {fmtDate(profile.created_at)}</span>
            </div>
            {profile.bio && <p className="mt-2 text-sm text-slate-300 max-w-xl">{profile.bio}</p>}
            {stats && (
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{xp.toLocaleString()} XP</span>
                  <span>{rp.next ? `${rp.toNext.toLocaleString()} to ${rp.next}` : 'Maximum rank'}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{ width: `${Math.round(rp.pct * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="sm:text-right">
            {d.group ? (
              <Link href={d.isMe ? '/squad' : '#'} className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 hover:bg-white/[0.07]">
                <PlayerAvatar avatar={d.group.emblem} size={28} />
                <span className="text-left leading-tight">
                  <span className="block text-sm text-white">{d.group.name}</span>
                  <span className="block text-[11px] font-mono text-slate-500">{d.group.group_code}{d.role === 'leader' ? ' · Leader' : ''}</span>
                </span>
              </Link>
            ) : (
              <span className="text-xs text-slate-500">{d.isMe ? 'Not in a squad yet' : 'No public squad'}</span>
            )}
          </div>
        </div>
      </section>

      {editor}

      {stats ? (
        <section aria-label="Statistics" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Credits" value={stats.credits.toLocaleString()} accent="text-emerald-200" sub="Server-verified" />
          <StatTile label="Science points" value={stats.science_total.toLocaleString()} accent="text-violet-200" />
          <StatTile label="Missions completed" value={stats.missions_completed} sub={`${stats.missions_failed} failed · ${stats.missions_started} launched`} />
          <StatTile label="Best score" value={stats.best_score} sub={`${stats.group_missions_completed} squad missions`} accent="text-cyan-200" />
        </section>
      ) : (
        <section className="rounded-2xl glass-panel p-5 flex items-center gap-3 text-sm text-slate-400"><Lock className="w-4 h-4" /> This pilot keeps their statistics private.</section>
      )}

      {stats && (
        <section className="rounded-2xl glass-panel p-5">
          <h2 className="font-display text-lg text-white mb-3">Achievements</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {d.achievements.map(a => {
              const at = d.unlocked.get(a.id);
              const Icon = ACH_ICONS[a.icon] ?? Sparkles;
              return (
                <li key={a.id} className={`rounded-xl p-3 border ${at ? 'border-cyan-400/30 bg-cyan-400/[0.07]' : 'border-white/[0.06] bg-white/[0.02] opacity-55'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${at ? 'bg-gradient-to-br from-cyan-300 to-violet-500 text-slate-950' : 'bg-white/[0.06] text-slate-500'}`}>
                    {at ? <Icon className="w-4.5 h-4.5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="mt-2 text-sm text-white">{a.title}</div>
                  <div className="text-[11px] text-slate-400 leading-snug">{a.description}</div>
                  {at && <div className="mt-1 text-[10px] font-mono text-cyan-300/80">{fmtDate(at)}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl glass-panel p-5">
        <h2 className="font-display text-lg text-white mb-3">Mission history</h2>
        {d.results.length === 0 ? (
          <p className="text-sm text-slate-400">{d.isMe ? 'No verified missions yet — launch one from the mission archive.' : 'No public mission history.'}</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead><tr className="text-left hud-label"><th className="px-2 py-2 font-normal">Mission</th><th className="px-2 font-normal">Outcome</th><th className="px-2 font-normal text-right">Score</th><th className="px-2 font-normal text-right">Science</th><th className="px-2 font-normal text-right">Credits</th><th className="px-2 font-normal text-right">Date</th></tr></thead>
              <tbody>
                {d.results.map(r => (
                  <tr key={r.id} className="border-t border-white/[0.05]">
                    <td className="px-2 py-2 text-white">{missionName(r.mission_id)}{r.group_id && <Users className="inline w-3.5 h-3.5 ml-1.5 text-violet-300" aria-label="Squad mission" />}</td>
                    <td className="px-2"><span className={`text-xs font-mono ${r.status === 'SUCCESS' ? 'text-emerald-300' : r.status === 'PARTIAL' ? 'text-amber-300' : 'text-rose-300'}`}>{r.status}</span></td>
                    <td className="px-2 text-right font-mono tabular-nums">{r.score}</td>
                    <td className="px-2 text-right font-mono tabular-nums">{r.science}</td>
                    <td className="px-2 text-right font-mono tabular-nums text-emerald-200">+{(r.credits_awarded + r.squad_bonus).toLocaleString()}</td>
                    <td className="px-2 text-right text-slate-400">{fmtDate(r.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-500 inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Rewards are computed by Mission Control servers from mission rules, not by the game client.</p>
      </section>
    </div>
  );
}
