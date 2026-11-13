import Link from 'next/link';
import { Users } from 'lucide-react';
import { getGroupLeaderboard, getSquadDashboard } from '@/lib/network/queries';
import { CreateSquad, ReceivedInvites, SquadDashboard } from '@/components/network/Squad';
import { PlayerAvatar } from '@/components/network/PlayerAvatar';
import { DbNotReady } from '@/components/network/DbNotReady';
import { PageHeader } from '@/components/network/ui';

export const metadata = { title: 'Squads', description: 'Form a squad of 2–4 pilots, share the 20 mission roles and fly missions together in a live mission room.' };

export default async function SquadPage() {
  const d = await getSquadDashboard();
  if (d?.group) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-5">
        <ReceivedInvites invites={d.receivedInvites} />
        <SquadDashboard d={d} />
      </div>
    );
  }
  const { rows, error } = await getGroupLeaderboard('all');
  if (error && /does not exist|schema cache|Could not find/i.test(error)) return <DbNotReady />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-5">
      <PageHeader eyebrow="Squads" title={d ? 'You are flying solo' : 'Squads'} />
      {d && <ReceivedInvites invites={d.receivedInvites} />}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        {d ? <CreateSquad /> : (
          <section className="rounded-2xl glass-panel p-6">
            <h2 className="font-display text-xl text-white">Fly with up to three other pilots</h2>
            <p className="text-sm text-slate-400 mt-2">Squads fly one mission together in a shared room: each pilot holds several of the 20 crew roles, decides only their own part of the flight and talks to the crew in a live squad chat. Two or more successful members earn a 10% credit bonus.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/register" className="cta-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950">Create account</Link>
              <Link href="/login?next=/squad" className="cta-ghost rounded-xl px-5 py-2.5 text-sm text-slate-200">Log in</Link>
            </div>
          </section>
        )}
        <section className="rounded-2xl glass-panel p-5" aria-label="Squad directory">
          <h2 className="font-display text-lg text-white">Squad directory</h2>
          <p className="text-sm text-slate-400 mt-1 mb-3">Squads are invite-only. Find a pilot from a squad you like and ask for an invite, or start your own.</p>
          {rows.length === 0 ? (
            <div className="text-sm text-slate-500 flex items-center gap-2"><Users className="w-4 h-4" /> No squads formed yet — be the first.</div>
          ) : (
            <ul className="space-y-1.5">
              {rows.slice(0, 10).map(g => (
                <li key={g.group_id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="w-6 text-right font-mono text-xs text-slate-500">{g.rank}</span>
                  <PlayerAvatar avatar={g.emblem} size={32} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-white truncate">{g.name}</span>
                    <span className="block text-[11px] font-mono text-slate-500">{g.group_code} · {g.members}/4</span>
                  </span>
                  <span className="font-mono text-xs text-cyan-200">{g.xp.toLocaleString()} XP</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
