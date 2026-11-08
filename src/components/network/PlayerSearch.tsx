'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Users, SearchX } from 'lucide-react';
import { searchPlayersAction, type PlayerSearchResult } from '@/app/actions/network';
import { PlayerAvatar } from './PlayerAvatar';
import { InviteButton } from './InviteButton';
import { EmptyState, Skeleton, Notice } from './ui';

export function PlayerSearch({ inSquad, signedIn }: { inSquad: boolean; signedIn: boolean }) {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<{ term: string; rows: PlayerSearchResult[]; error: string | null } | null>(null);
  const seq = useRef(0);
  const term = q.trim();
  const active = term.length >= 2;
  const loading = active && result?.term !== term;
  const rows = !active ? null : result?.term === term ? result.rows : null;
  const err = active && result?.term === term ? result.error : null;

  // Debounced search; stale responses are discarded
  useEffect(() => {
    if (term.length < 2) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      const res = await searchPlayersAction(term);
      if (id !== seq.current) return;
      setResult(res.ok ? { term, rows: res.data, error: null } : { term, rows: [], error: res.error });
    }, 300);
    return () => clearTimeout(t);
  }, [term]);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Search players by player ID, username or display name</span>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} maxLength={40}
          placeholder="Search MC-7K9X2P, @username or name" className="input-field !pl-12 !py-3.5 !text-base" />
      </label>
      {!signedIn ? <Notice><Link href="/login?next=/players" className="underline">Log in</Link> to invite pilots to a squad.</Notice>
        : !inSquad && <Notice>Create a squad before sending invitations. <Link href="/squad" className="underline">Go to squad</Link></Notice>}
      {err && <Notice tone="error">{err}</Notice>}
      <div aria-live="polite">
        {loading && (
          <ul className="space-y-2">{[0, 1, 2].map(i => <li key={i} className="flex items-center gap-3 rounded-2xl glass-panel p-3"><Skeleton className="w-11 h-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div></li>)}</ul>
        )}
        {!loading && rows === null && (
          <div className="rounded-2xl glass-panel"><EmptyState icon={<Users className="w-6 h-6" />} title="Find fellow pilots">Type at least 2 characters. Exact player IDs always match first. Emails are never searchable.</EmptyState></div>
        )}
        {!loading && rows && rows.length === 0 && !err && (
          <div className="rounded-2xl glass-panel"><EmptyState icon={<SearchX className="w-6 h-6" />} title="No pilots found">Check the player ID — it looks like MC- followed by 6 characters.</EmptyState></div>
        )}
        {!loading && rows && rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map(r => (
              <li key={r.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl glass-panel p-3 hover:border-cyan-400/30 transition-colors">
                <PlayerAvatar avatar={r.avatar} size={44} />
                <Link href={`/players/${r.player_code}`} className="flex-1 min-w-0">
                  <div className="text-white truncate">{r.display_name} <span className="text-slate-500 text-sm">@{r.username}</span></div>
                  <div className="text-xs font-mono text-slate-400 flex flex-wrap gap-x-3">
                    <span className="text-cyan-300">{r.player_code}</span><span>{r.rank}</span>
                    {r.missions_completed !== null && <span>{r.missions_completed} missions</span>}
                    {r.science_total !== null && <span>{r.science_total} sci</span>}
                    {r.group_code && <span className="text-violet-300">{r.group_name}</span>}
                  </div>
                </Link>
                {r.in_my_group ? <span className="text-xs text-emerald-300 px-2">In your squad</span>
                  : inSquad ? <InviteButton playerId={r.id} name={r.display_name} pending={r.invite_pending} compact /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
