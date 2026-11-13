'use client';

import React, { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function Panel({ children, className = '', as: As = 'section', ...rest }: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }) {
  return <As className={`rounded-2xl glass-panel ${className}`} {...rest}>{children}</As>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <div className="hud-label text-cyan-300/80">{eyebrow}</div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-wide text-white mt-1">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, accent = 'text-white' }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }) {
  return (
    <div className={`stat-tile rounded-xl pl-4 pr-3.5 py-3 ${accent}`}>
      <div className="hud-label">{label}</div>
      <div className="mt-1 font-mono tabular-nums text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 text-cyan-200 flex items-center justify-center mb-3">{icon}</div>
      <div className="text-white font-medium">{title}</div>
      {children && <div className="mt-1 text-sm text-slate-400 max-w-sm">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

export function Field({ label, name, error, hint, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: string }) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] text-slate-300 mb-1.5">{label}</label>
      <input id={id} name={name} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={`input-field ${error ? 'input-error' : ''}`} {...input} />
      {error ? <p id={`${id}-err`} className="mt-1 text-xs text-rose-300">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function PasswordField(props: Omit<React.ComponentProps<typeof Field>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field {...props} type={show ? 'text' : 'password'} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-[34px] p-1 rounded text-slate-400 hover:text-white">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function SubmitButton({ children, pendingLabel, className = '' }: { children: React.ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`cta-primary w-full rounded-xl py-3 text-sm font-semibold text-slate-950 inline-flex items-center justify-center gap-2 disabled:opacity-70 ${className}`}>
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: React.ReactNode }) {
  const cls = tone === 'error' ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : tone === 'ok' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100';
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3.5 py-2.5 text-sm ${cls}`}>{children}</div>;
}
