'use client';

import React, { useState, useTransition } from 'react';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { invitePlayerAction } from '@/app/actions/network';
import { CREW_ROLES, crewRole, type CrewRole } from '@/lib/network/crewRoles';
import { sounds } from '@/lib/sound';

/** Invite a player to your squad as one of the four crew roles. */
export function InviteButton({ playerId, name, pending: initiallyPending = false, compact = false }: { playerId: string; name: string; pending?: boolean; compact?: boolean }) {
  const [busy, start] = useTransition();
  const [sent, setSent] = useState(initiallyPending);
  const [role, setRole] = useState<CrewRole>('engineer');
  const [err, setErr] = useState<string | null>(null);
  const selectId = `crew-role-${playerId}`;
  const invite = () => start(async () => {
    setErr(null);
    const res = await invitePlayerAction(playerId, role);
    if (res.ok) { setSent(true); sounds.playRadioIn(); } else { setErr(res.error); sounds.playWarning(); }
  });
  const RoleIcon = crewRole(role).icon;
  return (
    <div className={compact ? 'flex flex-col items-end gap-1' : 'flex flex-wrap items-center gap-2'}>
      <div className="flex items-center gap-2">
        {!sent && (
          <div className="relative">
            <label htmlFor={selectId} className="sr-only">Crew role for {name}</label>
            <RoleIcon className="w-3.5 h-3.5 text-cyan-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
            <select id={selectId} value={role} onChange={e => setRole(e.target.value as CrewRole)} disabled={busy}
              className="appearance-none rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/40 focus:border-cyan-400/60 text-sm text-slate-100 pl-8 pr-7 py-2 outline-none transition-colors">
              {CREW_ROLES.map(r => <option key={r.id} value={r.id}>{compact ? r.short : r.label}</option>)}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] pointer-events-none" aria-hidden>▾</span>
          </div>
        )}
        <button type="button" onClick={invite} disabled={busy || sent}
          aria-label={sent ? `Invitation sent to ${name}` : `Invite ${name} to your squad as ${crewRole(role).label}`}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-colors ${sent ? 'bg-emerald-400/10 text-emerald-200 border border-emerald-400/30' : 'cta-secondary text-cyan-100'}`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {sent ? 'Invited' : compact ? 'Invite' : 'Invite to squad'}
        </button>
      </div>
      {!sent && !compact && <span className="text-xs text-slate-500">{crewRole(role).blurb}</span>}
      {err && <span className="text-xs text-rose-300" role="alert">{err}</span>}
    </div>
  );
}
