'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Trash2, CheckCheck, Mail, Users, Rocket, Award, Crown, Coins } from 'lucide-react';
import { deleteNotificationAction, markNotificationsReadAction, respondInvitationAction } from '@/app/actions/network';
import type { NotificationRow } from '@/lib/network/queries';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthProvider';
import { EmptyState, Notice } from './ui';

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  invite: Mail, invite_accepted: Users, invite_declined: Users, member_joined: Users, member_left: Users, member_removed: Users,
  leadership: Crown, group_mission: Rocket, mission_result: Rocket, achievement: Award, squad_bonus: Coins,
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

export function NotificationsList({ items, pendingInviteIds }: { items: NotificationRow[]; pendingInviteIds: string[] }) {
  const router = useRouter();
  const { refresh, player } = useAuth();
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const pending = new Set(pendingInviteIds);

  // New notifications arrive over Realtime → re-render the server list
  useEffect(() => {
    if (!player) return;
    const supabase = createClient();
    const ch = supabase.channel(`notif-page:${player.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_notifications', filter: `recipient_id=eq.${player.id}` }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [player, router]);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => {
    const r = await fn();
    if (!r.ok) setErr(r.error ?? 'Request failed.'); else setErr(null);
    await refresh();
    router.refresh();
  });

  if (!items.length) return <div className="rounded-2xl glass-panel"><EmptyState icon={<Bell className="w-6 h-6" />} title="No notifications">Squad invitations, mission reports and achievements appear here.</EmptyState></div>;
  const unread = items.filter(i => !i.read_at).map(i => i.id);
  return (
    <div className="space-y-3">
      {err && <Notice tone="error">{err}</Notice>}
      {unread.length > 0 && (
        <div className="flex justify-end">
          <button type="button" disabled={busy} onClick={() => act(() => markNotificationsReadAction('all'))} className="inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-100"><CheckCheck className="w-4 h-4" /> Mark all read</button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map(n => {
          const Icon = ICON[n.kind] ?? Bell;
          const invId = n.kind === 'invite' ? n.payload.invitation_id : null;
          return (
            <li key={n.id} className={`flex gap-3 rounded-2xl p-4 border transition-colors ${n.read_at ? 'glass-panel opacity-80' : 'bg-cyan-400/[0.06] border-cyan-400/25'}`}
              onMouseEnter={() => { if (!n.read_at) act(() => markNotificationsReadAction([n.id])); }}>
              <span className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-cyan-200" /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-white text-sm font-medium">{n.title}</span>
                  <span className="text-[11px] text-slate-500 shrink-0">{ago(n.created_at)}</span>
                </div>
                {n.body && <p className="text-sm text-slate-300 mt-0.5">{n.body}</p>}
                {invId && pending.has(invId) && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => act(() => respondInvitationAction(invId, true))} className="cta-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950">Join squad</button>
                    <button type="button" disabled={busy} onClick={() => act(() => respondInvitationAction(invId, false))} className="cta-ghost rounded-lg px-3 py-1.5 text-xs text-slate-300">Decline</button>
                  </div>
                )}
                {n.kind === 'group_mission' && <Link href="/squad" className="mt-1 inline-block text-xs text-cyan-300 hover:text-cyan-100">Open squad missions</Link>}
              </div>
              <button type="button" aria-label="Delete notification" disabled={busy} onClick={() => act(() => deleteNotificationAction(n.id))} className="self-start p-1 text-slate-500 hover:text-rose-200"><Trash2 className="w-4 h-4" /></button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
