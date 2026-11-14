'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2 } from 'lucide-react';
import { updateProfileAction } from '@/app/actions/network';
import { AVATAR_COLORS, AVATAR_SHAPES, parseAvatar } from '@/lib/network/avatars';
import type { Profile } from '@/lib/network/queries';
import { useAuth } from './AuthProvider';
import { PlayerAvatar } from './PlayerAvatar';
import { Notice } from './ui';

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const init = parseAvatar(profile.avatar);
  const [form, setForm] = useState({
    displayName: profile.display_name, shape: init.shape, color: init.color, bio: profile.bio ?? '',
    showStats: profile.show_stats, showHistory: profile.show_history, showGroup: profile.show_group,
  });

  const save = () => start(async () => {
    const res = await updateProfileAction({
      displayName: form.displayName, avatar: `${form.shape}-${form.color}`, bio: form.bio,
      showStats: form.showStats, showHistory: form.showHistory, showGroup: form.showGroup,
    });
    setMsg(res.ok ? { tone: 'ok', text: 'Profile updated' } : { tone: 'error', text: res.error });
    if (res.ok) { await refresh(); router.refresh(); setOpen(false); }
  });

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="cta-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-cyan-100">
          <Pencil className="w-4 h-4" /> Edit profile & privacy
        </button>
        {msg && <span className={`text-sm ${msg.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`} role="status">{msg.text}</span>}
      </div>
    );
  }
  return (
    <section className="rounded-2xl glass-panel p-5 space-y-5" aria-label="Edit profile">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div>
            <label htmlFor="dn" className="block text-[13px] text-slate-300 mb-1.5">Display name</label>
            <input id="dn" className="input-field" maxLength={32} value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="bio" className="block text-[13px] text-slate-300 mb-1.5">Bio <span className="text-slate-500">({form.bio.length}/160)</span></label>
            <textarea id="bio" className="input-field min-h-[84px]" maxLength={160} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[13px] text-slate-300 mb-1">Public visibility</legend>
            {([['showStats', 'Statistics, achievements & leaderboard listing'], ['showHistory', 'Mission history'], ['showGroup', 'Squad membership']] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-cyan-400" checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />
                {label}
              </label>
            ))}
            <p className="text-[11px] text-slate-500">Player ID and username are permanent. Join with this username on any device to continue playing.</p>
          </fieldset>
        </div>
        <div>
          <div className="text-[13px] text-slate-300 mb-2">Avatar</div>
          <div className="flex items-center gap-4 mb-3"><PlayerAvatar avatar={`${form.shape}-${form.color}`} size={72} ring /></div>
          <div className="grid grid-cols-8 gap-1.5 mb-3" role="radiogroup" aria-label="Avatar emblem">
            {AVATAR_SHAPES.map(sh => (
              <button key={sh} type="button" role="radio" aria-checked={form.shape === sh} aria-label={sh} onClick={() => setForm(f => ({ ...f, shape: sh }))}
                className={`rounded-xl p-1 ${form.shape === sh ? 'bg-cyan-400/20 ring-1 ring-cyan-300' : 'hover:bg-white/[0.06]'}`}>
                <PlayerAvatar avatar={`${sh}-${form.color}`} size={30} />
              </button>
            ))}
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Avatar colour">
            {AVATAR_COLORS.map(c => (
              <button key={c} type="button" role="radio" aria-checked={form.color === c} aria-label={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`rounded-full p-0.5 ${form.color === c ? 'ring-2 ring-white' : ''}`}>
                <PlayerAvatar avatar={`ring-${c}`} size={26} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {msg?.tone === 'error' && <Notice tone="error">{msg.text}</Notice>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={pending} className="cta-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950 inline-flex items-center gap-2">
          {pending && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
        </button>
        <button type="button" onClick={() => setOpen(false)} className="cta-ghost rounded-xl px-4 py-2.5 text-sm text-slate-300">Cancel</button>
      </div>
    </section>
  );
}
