'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { Check, X, Loader2, UserPlus, LogIn } from 'lucide-react';
import { joinGameAction, type AuthFormState } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import { Field, SubmitButton, Notice } from './ui';

const initial: AuthFormState = {};
type Mode = 'new' | 'existing';
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/**
 * Join the game with a unique username: no email, no password.
 * "New pilot" creates the username; "Returning pilot" continues with an existing one (older email accounts too).
 */
export function JoinForm({ next, banner }: { next: string; banner?: string | null }) {
  const [state, action] = useActionState(joinGameAction, initial);
  const [mode, setMode] = useState<Mode>('new');
  const [username, setUsername] = useState(state.username ?? '');
  const [checked, setChecked] = useState<{ name: string; taken: boolean | null } | null>(null);
  const u = username.trim().toLowerCase();
  const valid = USERNAME_RE.test(u);
  const known = valid && checked?.name === u ? checked.taken : undefined; // undefined = still checking

  // Debounced live lookup (public RPC that returns only a boolean)
  useEffect(() => {
    if (!USERNAME_RE.test(u)) return;
    const id = setTimeout(async () => {
      const { data, error } = await createClient().rpc('username_available', { candidate: u });
      setChecked({ name: u, taken: error ? null : !data });
    }, 350);
    return () => clearTimeout(id);
  }, [u]);

  let hint = 'Your unique pilot name: 3–20 letters, numbers or _';
  let status: 'idle' | 'checking' | 'good' | 'bad' = 'idle';
  if (u && !valid) { hint = '3–20 lowercase letters, numbers or _ (no spaces)'; status = 'bad'; }
  else if (valid && known === undefined) { hint = 'Checking…'; status = 'checking'; }
  else if (valid && known !== null && known !== undefined) {
    if (mode === 'new') {
      hint = known ? 'Taken. Choose another, or switch to "Returning pilot" if it is yours.' : 'Available: this name will be yours.';
      status = known ? 'bad' : 'good';
    } else {
      hint = known ? 'Pilot found. Welcome back!' : 'No pilot with this name yet. Switch to "New pilot" to create it.';
      status = known ? 'good' : 'bad';
    }
  }

  const tab = (m: Mode, label: string, Icon: typeof UserPlus) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition-colors ${mode === m ? 'bg-cyan-400 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-white/[0.06]'}`}>
      <Icon className="w-4 h-4" aria-hidden /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {banner && <Notice>{banner}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div role="tablist" aria-label="Join as" className="flex gap-1 rounded-xl bg-slate-900/80 border border-white/10 p-1">
        {tab('new', 'New pilot', UserPlus)}
        {tab('existing', 'Returning pilot', LogIn)}
      </div>
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />
        <div className="relative">
          <Field label="Username" name="username" autoComplete="username" required maxLength={20} autoFocus
            value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
            error={state.fieldErrors?.username} hint={hint} />
          <span className="absolute right-3 top-[36px]" aria-hidden>
            {status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            {status === 'good' && <Check className="w-4 h-4 text-emerald-300" />}
            {status === 'bad' && <X className="w-4 h-4 text-rose-300" />}
          </span>
        </div>
        <SubmitButton pendingLabel="Joining…">{mode === 'new' ? 'Create pilot & join game' : 'Join game'}</SubmitButton>
      </form>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        No email or password needed. Your progress, credits, squad and rankings are saved under your username,
        so you can come back on any device by joining with the same name.
      </p>
    </div>
  );
}
