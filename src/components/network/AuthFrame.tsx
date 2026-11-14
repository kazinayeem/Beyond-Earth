import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

/** Two-column cinematic frame for auth screens. */
export function AuthFrame({ eyebrow, title, subtitle, children, footer }: {
  eyebrow: string; title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-14 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
      <div className="hidden lg:block">
        <Image src="/brand/logo-768.jpg" alt="Mission Control: Beyond the Earth" width={768} height={512} priority
          className="w-full max-w-[480px] h-auto rounded-3xl ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(56,189,248,0.45)]" />
        <div className="hud-label text-cyan-300/80 mt-8">Mission Control network</div>
        <p className="font-display text-4xl font-semibold leading-tight text-white mt-2">
          One unique username.<br />Squads of up to four.<br /><span className="text-cyan-200">No email, no password.</span>
        </p>
        <ul className="mt-6 space-y-2 text-slate-400 text-sm">
          <li>· Join with the same username on any device to keep your progress</li>
          <li>· Fly solo, or with your squad in real time with crew roles</li>
          <li>· Compete on global, weekly and squad leaderboards</li>
        </ul>
      </div>
      <div className="w-full max-w-md mx-auto lg:mx-0 lg:justify-self-end">
        <div className="rounded-3xl glass-panel p-6 sm:p-8 auth-card">
          <div className="hud-label text-cyan-300/80">{eyebrow}</div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white mt-1">{title}</h1>
          <p className="text-sm text-slate-400 mt-1.5 mb-6">{subtitle}</p>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-400">{footer}</div>}
        <div className="mt-3 text-center"><Link href="/" className="text-xs text-slate-500 hover:text-slate-300">← Back to Mission Control</Link></div>
      </div>
    </div>
  );
}
