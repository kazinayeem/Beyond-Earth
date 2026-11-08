'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, Loader2, CloudOff, Trophy } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/components/network/AuthProvider';

/** Debrief banner: what Mission Control's server actually recorded for this run. */
export function OnlineVerificationPanel() {
  const online = useGameStore(s => s.onlineResult);
  const { refresh } = useAuth();
  useEffect(() => { if (online.state === 'verified') void refresh(); }, [online.state, refresh]);

  if (online.state === 'idle') return null;
  if (online.state === 'pending') {
    return (
      <div className="flex items-center gap-3 rounded-2xl glass-panel px-4 py-3 text-sm text-slate-300" role="status">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-300" /> Transmitting mission report to Mission Control…
      </div>
    );
  }
  if (online.state === 'offline' || online.state === 'error') {
    const Icon = online.state === 'offline' ? CloudOff : ShieldAlert;
    return (
      <div className="flex items-start gap-3 rounded-2xl glass-panel px-4 py-3 text-sm" role="status">
        <Icon className="w-5 h-5 shrink-0 text-amber-300" />
        <div>
          <div className="text-amber-100">Result not recorded on the global leaderboard</div>
          <div className="text-slate-400 text-xs mt-0.5">{online.state === 'offline' ? online.reason : online.error}</div>
        </div>
      </div>
    );
  }
  const d = online.data;
  return (
    <div className="rounded-2xl glass-panel px-4 py-3" role="status">
      <div className="flex items-center gap-2 text-emerald-200 text-sm">
        <ShieldCheck className="w-4 h-4" /> Verified by Mission Control server
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono tabular-nums text-center">
        <Cell label="Outcome" value={d.status} />
        <Cell label="Score" value={String(d.score)} />
        <Cell label="Credits" value={`+${(d.credits + d.squad_bonus).toLocaleString()}`} />
        <Cell label="XP" value={`+${d.xp}`} />
        <Cell label="Rank" value={d.totals.rank} />
      </div>
      {d.squad_bonus > 0 && <div className="mt-2 text-xs text-violet-200">Includes +{d.squad_bonus} squad coordination bonus</div>}
      {d.achievements.length > 0 && <div className="mt-1 text-xs text-cyan-200">New achievements: {d.achievements.join(', ')}</div>}
      <Link href="/leaderboard" className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-100">
        <Trophy className="w-3.5 h-3.5" /> View global leaderboard
      </Link>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm text-white truncate">{value}</div>
    </div>
  );
}
