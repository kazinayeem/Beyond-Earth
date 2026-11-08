'use client';

import React, { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X, Loader2 } from 'lucide-react';
import { loginAction, registerAction, forgotPasswordAction, resetPasswordAction, googleAction, type AuthFormState } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import { Field, PasswordField, SubmitButton, Notice } from './ui';

const initial: AuthFormState = {};

export function LoginForm({ next, googleEnabled, banner }: { next: string; googleEnabled: boolean; banner?: string | null }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <div className="space-y-4">
      {banner && <Notice>{banner}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
        <PasswordField label="Password" name="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Sessions stay signed in on this device</span>
          <Link href="/forgot-password" className="text-cyan-300 hover:text-cyan-100">Forgot password?</Link>
        </div>
        <SubmitButton pendingLabel="Authenticating…">Sign in</SubmitButton>
      </form>
      {googleEnabled && <GoogleButton next={next} />}
    </div>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <form action={googleAction}>
      <input type="hidden" name="next" value={next} />
      <div className="flex items-center gap-3 my-1 text-[11px] text-slate-500"><span className="h-px flex-1 bg-white/10" />OR<span className="h-px flex-1 bg-white/10" /></div>
      <button type="submit" className="w-full rounded-xl py-3 text-sm text-slate-100 border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] inline-flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </button>
    </form>
  );
}

function strength(pw: string) {
  const checks = [
    { ok: pw.length >= 10, label: '10+ characters' },
    { ok: /[a-z]/.test(pw), label: 'Lowercase' },
    { ok: /[A-Z]/.test(pw), label: 'Uppercase' },
    { ok: /\d/.test(pw), label: 'Number' },
  ];
  return { checks, score: checks.filter(c => c.ok).length };
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useActionState(registerAction, initial);
  const [pw, setPw] = useState('');
  const [username, setUsername] = useState('');
  const [checked, setChecked] = useState<{ name: string; result: 'ok' | 'taken' | 'idle' } | null>(null);
  const u = username.trim().toLowerCase();
  const avail: 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' =
    !u ? 'idle' : !/^[a-z0-9_]{3,20}$/.test(u) ? 'invalid' : checked?.name === u ? checked.result : 'checking';
  const s = useMemo(() => strength(pw), [pw]);

  // Debounced live username availability (public RPC, returns only a boolean)
  useEffect(() => {
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return;
    const id = setTimeout(async () => {
      const { data, error } = await createClient().rpc('username_available', { candidate: u });
      setChecked({ name: u, result: error ? 'idle' : data ? 'ok' : 'taken' });
    }, 400);
    return () => clearTimeout(id);
  }, [u]);

  if (state.notice) {
    return (
      <div className="space-y-4">
        <Notice tone="ok">{state.notice}</Notice>
        <p className="text-sm text-slate-400">After confirming, sign in to receive your permanent MC player ID.</p>
        <Link href="/login" className="cta-primary block text-center w-full rounded-xl py-3 text-sm font-semibold text-slate-950">Go to sign in</Link>
      </div>
    );
  }
  const userHint = avail === 'checking' ? 'Checking availability…' : avail === 'ok' ? 'Callsign available' : avail === 'taken' ? 'Callsign taken' : avail === 'invalid' ? '3–20 lowercase letters, numbers or _' : 'Your permanent @callsign';
  return (
    <div className="space-y-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form action={action} className="space-y-4" noValidate>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Display name" name="displayName" autoComplete="nickname" required maxLength={32} error={state.fieldErrors?.displayName} />
          <div className="relative">
            <Field label="Username" name="username" autoComplete="username" required maxLength={20}
              value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
              error={state.fieldErrors?.username ?? (avail === 'taken' ? 'That username is taken' : undefined)} hint={userHint} />
            <span className="absolute right-3 top-[36px]" aria-hidden>
              {avail === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              {avail === 'ok' && <Check className="w-4 h-4 text-emerald-300" />}
              {(avail === 'taken' || avail === 'invalid') && <X className="w-4 h-4 text-rose-300" />}
            </span>
          </div>
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} hint="Never shown to other players" />
        <div>
          <PasswordField label="Password" name="password" autoComplete="new-password" required value={pw} onChange={e => setPw(e.target.value)} error={state.fieldErrors?.password} />
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map(i => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < s.score ? (s.score < 3 ? 'bg-amber-300' : s.score < 4 ? 'bg-cyan-300' : 'bg-emerald-300') : 'bg-white/10'}`} />
            ))}
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {s.checks.map(c => <li key={c.label} className={c.ok ? 'text-emerald-300' : 'text-slate-500'}>{c.ok ? '✓' : '·'} {c.label}</li>)}
          </ul>
        </div>
        <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" required error={state.fieldErrors?.confirm} />
        <SubmitButton pendingLabel="Registering pilot…">Create account</SubmitButton>
      </form>
      {googleEnabled && <GoogleButton next="/profile?welcome=1" />}
    </div>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.notice && <Notice tone="ok">{state.notice}</Notice>}
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <PasswordField label="New password" name="password" autoComplete="new-password" required error={state.fieldErrors?.password} hint="10+ characters with upper, lower and a number" />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" required error={state.fieldErrors?.confirm} />
      <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
    </form>
  );
}
