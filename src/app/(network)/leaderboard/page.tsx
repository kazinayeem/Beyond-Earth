import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { getGroupLeaderboard, getLeaderboard, type GroupLeaderRow, type LeaderRow } from '@/lib/network/queries';
import { PlayerAvatar } from '@/components/network/PlayerAvatar';
import { PageHeader, EmptyState } from '@/components/network/ui';
import { DbNotReady } from '@/components/network/DbNotReady';

export const metadata = { title: 'Leaderboard · Mission Control' };

const CATS = [
  { id: 'xp', label: 'Experience', unit: 'XP' },
  { id: 'science', label: 'Science points', unit: 'SCI' },
  { id: 'missions', label: 'Missions completed', unit: 'MISSIONS' },
  { id: 'credits', label: 'Credits', unit: 'CR' },
] as const;
const PERIODS = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'week', label: 'Last 7 days' },
] as const;

type SP = { board?: string; cat?: string; period?: string };

function href(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams({ board: sp.board ?? 'players', cat: sp.cat ?? 'xp', period: sp.period ?? 'all', ...patch } as Record<string, string>);
  return `/leaderboard?${p}`;
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const board = sp.board === 'squads' ? 'squads' : 'players';
  const cat = CATS.find(c => c.id === sp.cat) ?? CATS[0];
  const period = PERIODS.find(p => p.id === sp.period) ?? PERIODS[0];

  const res = board === 'players' ? await getLeaderboard(cat.id, period.id) : await getGroupLeaderboard(period.id);
  if (res.error && /does not exist|schema cache|Could not find/i.test(res.error)) return <DbNotReady />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <PageHeader eyebrow="Rankings" title="Leaderboard" />
      <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Board">
        {(['players', 'squads'] as const).map(b => (
          <Link key={b} role="tab" aria-selected={board === b} href={href(sp, { board: b })}
            className={`px-4 py-2 rounded-xl text-sm ${board === b ? 'bg-cyan-300 text-slate-950 font-semibold' : 'glass-panel text-slate-300 hover:text-white'}`}>
            {b === 'players' ? 'Pilots' : 'Squads'}
          </Link>
        ))}
        <span className="flex-1" />
        <div className="flex rounded-xl glass-panel p-1" aria-label="Period">
          {PERIODS.map(p => (
            <Link key={p.id} href={href(sp, { period: p.id })} aria-current={period.id === p.id ? 'true' : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs ${period.id === p.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>{p.label}</Link>
          ))}
        </div>
      </div>
      {board === 'players' && (
        <div className="flex flex-wrap gap-1.5 mb-6" aria-label="Category">
          {CATS.map(c => (
            <Link key={c.id} href={href(sp, { cat: c.id })} aria-current={cat.id === c.id ? 'true' : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs ${cat.id === c.id ? 'bg-violet-400/20 text-violet-100 ring-1 ring-violet-300/40' : 'text-slate-400 hover:text-white bg-white/[0.03]'}`}>{c.label}</Link>
          ))}
        </div>
      )}

      {board === 'players'
        ? <PlayerBoard rows={res.rows as LeaderRow[]} unit={cat.unit} cat={cat.id} />
        : <SquadBoard rows={res.rows as GroupLeaderRow[]} />}
      <p className="mt-4 text-[11px] text-slate-500">Rankings use server-verified results only. Weekly and monthly boards are rolling windows. Pilots with private statistics are not listed.</p>
    </div>
  );
}

const MEDAL = ['podium-gold', 'podium-silver', 'podium-bronze'];

function Podium<T>({ top, render }: { top: T[]; render: (row: T, i: number) => React.ReactNode }) {
  // visual order: 2nd, 1st, 3rd
  const order = [1, 0, 2].filter(i => top[i]);
  return (
    <ol className="grid grid-cols-3 gap-3 items-end mb-6" aria-label="Top three">
      {order.map(i => (
        <li key={i} className={`podium ${MEDAL[i]} ${i === 0 ? 'podium-first' : ''}`} style={{ animationDelay: `${[0.15, 0, 0.3][i]}s` }}>
          {render(top[i], i)}
        </li>
      ))}
    </ol>
  );
}

function PlayerBoard({ rows, unit, cat }: { rows: LeaderRow[]; unit: string; cat: string }) {
  if (!rows.length) return <div className="rounded-2xl glass-panel"><EmptyState icon={<Trophy className="w-6 h-6" />} title="No ranked pilots yet">Complete a mission to appear here.</EmptyState></div>;
  const top = rows.filter(r => r.rank <= 3);
  const rest = rows.filter(r => r.rank > 3);
  return (
    <>
      <Podium top={top} render={(r, i) => (
        <Link href={`/players/${r.player_code}`} className="flex flex-col items-center text-center">
          <div className="podium-rank">{i + 1}</div>
          <PlayerAvatar avatar={r.avatar} size={i === 0 ? 72 : 56} ring={r.is_me} />
          <div className="mt-2 text-sm text-white truncate max-w-full">{r.display_name}</div>
          <div className="text-[11px] font-mono text-slate-400">{r.player_code}</div>
          <div className="mt-1 font-mono tabular-nums text-lg text-white">{Number(r.value).toLocaleString()} <span className="text-[10px] text-slate-400">{unit}</span></div>
        </Link>
      )} />
      {rest.length > 0 && (
        <div className="rounded-2xl glass-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left hud-label"><th className="px-4 py-3 font-normal w-14">Rank</th><th className="font-normal">Pilot</th>{cat !== 'science' && <th className="font-normal text-right hidden sm:table-cell">Science</th>}{cat !== 'missions' && <th className="font-normal text-right hidden sm:table-cell">Missions</th>}{cat !== 'xp' && <th className="font-normal text-right hidden md:table-cell">XP</th>}<th className="font-normal text-right px-4">{unit}</th></tr></thead>
            <tbody>
              {rest.map(r => (
                <tr key={r.player_id} className={`border-t border-white/[0.05] ${r.is_me ? 'bg-cyan-400/10' : ''}`} aria-current={r.is_me ? 'true' : undefined}>
                  <td className="px-4 py-2.5 font-mono text-slate-400">{r.rank}</td>
                  <td><Link href={`/players/${r.player_code}`} className="flex items-center gap-2.5 py-1.5"><PlayerAvatar avatar={r.avatar} size={30} /><span className="min-w-0"><span className="block text-white truncate">{r.display_name}{r.is_me && <span className="ml-1.5 text-[10px] text-cyan-300">YOU</span>}</span><span className="block text-[11px] font-mono text-slate-500">{r.player_code} · {r.player_rank}</span></span></Link></td>
                  {cat !== 'science' && <td className="text-right font-mono tabular-nums hidden sm:table-cell">{Number(r.science).toLocaleString()}</td>}
                  {cat !== 'missions' && <td className="text-right font-mono tabular-nums hidden sm:table-cell">{r.missions}</td>}
                  {cat !== 'xp' && <td className="text-right font-mono tabular-nums hidden md:table-cell">{Number(r.xp).toLocaleString()}</td>}
                  <td className="text-right font-mono tabular-nums px-4 text-white">{Number(r.value).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SquadBoard({ rows }: { rows: GroupLeaderRow[] }) {
  if (!rows.length) return <div className="rounded-2xl glass-panel"><EmptyState icon={<Trophy className="w-6 h-6" />} title="No ranked squads yet">Squads rank by mission XP earned together.</EmptyState></div>;
  const top = rows.filter(r => r.rank <= 3);
  const rest = rows.filter(r => r.rank > 3);
  return (
    <>
      <Podium top={top} render={(r, i) => (
        <div className="flex flex-col items-center text-center">
          <div className="podium-rank">{i + 1}</div>
          <PlayerAvatar avatar={r.emblem} size={i === 0 ? 72 : 56} ring={r.is_mine} />
          <div className="mt-2 text-sm text-white truncate max-w-full">{r.name}</div>
          <div className="text-[11px] font-mono text-slate-400">{r.group_code}</div>
          <div className="mt-1 font-mono tabular-nums text-lg text-white">{Number(r.xp).toLocaleString()} <span className="text-[10px] text-slate-400">XP</span></div>
        </div>
      )} />
      {rest.length > 0 && (
        <div className="rounded-2xl glass-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left hud-label"><th className="px-4 py-3 font-normal w-14">Rank</th><th className="font-normal">Squad</th><th className="font-normal text-right">Crew</th><th className="font-normal text-right hidden sm:table-cell">Science</th><th className="font-normal text-right px-4">XP</th></tr></thead>
            <tbody>
              {rest.map(r => (
                <tr key={r.group_id} className={`border-t border-white/[0.05] ${r.is_mine ? 'bg-cyan-400/10' : ''}`}>
                  <td className="px-4 py-2.5 font-mono text-slate-400">{r.rank}</td>
                  <td className="py-1.5"><span className="flex items-center gap-2.5"><PlayerAvatar avatar={r.emblem} size={30} /><span><span className="block text-white">{r.name}</span><span className="block text-[11px] font-mono text-slate-500">{r.group_code}</span></span></span></td>
                  <td className="text-right font-mono">{r.members}/3</td>
                  <td className="text-right font-mono tabular-nums hidden sm:table-cell">{Number(r.science).toLocaleString()}</td>
                  <td className="text-right font-mono tabular-nums px-4 text-white">{Number(r.xp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
