'use client';

import React, { useState, useTransition } from 'react';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { invitePlayerAction } from '@/app/actions/network';
import { sounds } from '@/lib/sound';

export function InviteButton({ playerId, name, pending: initiallyPending = false, compact = false }: { playerId: string; name: string; pending?: boolean; compact?: boolean }) {
  const [busy, start] = useTransition();
  const [sent, setSent] = useState(initiallyPending);
  const [err, setErr] = useState<string | null>(null);
  const invite = () => start(async () => {
    setErr(null);
    const res = await invitePlayerAction(playerId);
    if (res.ok) { setSent(true); sounds.playRadioIn(); } else { setErr(res.error); sounds.playWarning(); }
  });
  return (
    <div className={compact ? 'flex flex-col items-end' : 'flex items-center gap-3'}>
      <button type="button" onClick={invite} disabled={busy || sent} aria-label={sent ? `Invitation sent to ${name}` : `Invite ${name} to your squad`}
        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-colors ${sent ? 'bg-emerald-400/10 text-emerald-200 border border-emerald-400/30' : 'cta-secondary text-cyan-100'}`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
        {sent ? 'Invited' : 'Invite to squad'}
      </button>
      {err && <span className="text-xs text-rose-300 mt-1" role="alert">{err}</span>}
    </div>
  );
}
