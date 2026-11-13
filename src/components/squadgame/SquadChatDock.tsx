'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Minus, Send, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useAuth } from '@/components/network/AuthProvider';
import { crewRole } from '@/lib/network/crewRoles';
import { sendSquadMessage } from '@/lib/squad/client';

interface Msg { id: number; sender_id: string | null; kind: 'chat' | 'system'; body: string; created_at: string }
interface Mate { id: string; name: string; roles: string[] }

const OPEN_KEY = 'beyond_earth_squad_chat_open';

const noopSubscribe = () => () => {};
function readStoredOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; /* storage unavailable */ }
}

/**
 * Floating squad chat on every page: a squad bubble bottom-right, click to open, minimise to go back.
 * Every message is stored in `squad_messages` and visible to the whole squad (and only the squad — RLS).
 */
export function SquadChatDock() {
  const { status, player } = useAuth();
  const pathname = usePathname();
  const [loadedGroupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [mates, setMates] = useState<Mate[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const storedOpen = useSyncExternalStore(noopSubscribe, readStoredOpen, () => false);
  const [openChoice, setOpen] = useState<boolean | null>(null);
  const open = openChoice ?? storedOpen;
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);
  const me = player?.id ?? null;
  const canChat = isSupabaseConfigured && status === 'signedIn' && !!me;
  const groupId = canChat ? loadedGroupId : null;
  // membership only changes on squad / players / notifications pages; skip re-querying on every other navigation
  const membershipKey = /^\/(squad|players|notifications|profile)/.test(pathname ?? '') ? pathname : 'other';

  const toggle = useCallback((v: boolean) => {
    setOpen(v);
    if (v) setUnread(0);
    try { localStorage.setItem(OPEN_KEY, v ? '1' : '0'); } catch { /* storage unavailable */ }
  }, []);

  // Which squad am I in? (re-checked when the route changes, e.g. after joining or leaving)
  useEffect(() => {
    if (!canChat) return;
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data: mem } = await supabase.from('group_members').select('group_id').eq('player_id', me).maybeSingle();
      if (!alive) return;
      const gid = (mem?.group_id as string | undefined) ?? null;
      setGroupId(prev => (prev === gid ? prev : gid));
      if (!gid) { setMates([]); setMsgs([]); return; }
      const [{ data: g }, { data: rows }] = await Promise.all([
        supabase.from('groups').select('name').eq('id', gid).maybeSingle(),
        supabase.from('group_members').select('player_id, crew_roles, profile:profiles(display_name)').eq('group_id', gid),
      ]);
      if (!alive) return;
      setGroupName((g?.name as string) ?? 'Squad');
      setMates((rows ?? []).map(r => {
        const p = Array.isArray(r.profile) ? r.profile[0] : r.profile;
        return { id: r.player_id as string, name: (p?.display_name as string) ?? 'Pilot', roles: (r.crew_roles ?? []) as string[] };
      }));
    })();
    return () => { alive = false; };
  }, [canChat, me, membershipKey]);

  // History + live stream
  useEffect(() => {
    if (!groupId) return;
    const supabase = createClient();
    let alive = true;
    (async () => {
      const { data } = await supabase.from('squad_messages').select('id, sender_id, kind, body, created_at').eq('group_id', groupId).order('id', { ascending: false }).limit(80);
      if (alive) setMsgs(((data ?? []) as Msg[]).reverse());
    })();
    const channel = supabase.channel(`squad-chat-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'squad_messages', filter: `group_id=eq.${groupId}` }, payload => {
        const m = payload.new as Msg;
        setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m].slice(-200)));
        if (!openRef.current && m.sender_id !== me) setUnread(u => Math.min(99, u + 1));
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [groupId, me]);

  useEffect(() => { if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, open]);

  if (!isSupabaseConfigured || status !== 'signedIn' || !groupId) return null;

  const nameOf = (id: string | null) => mates.find(m => m.id === id)?.name ?? 'Pilot';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setErr(null);
    const res = await sendSquadMessage(body);
    setSending(false);
    if (res.ok) setText(''); else setErr(res.error);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[120] flex flex-col items-end gap-2 pointer-events-none">
      {open && (
        <section aria-label="Squad chat" className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] h-[min(26rem,60dvh)] flex flex-col rounded-2xl border border-cyan-400/30 bg-slate-950/95 backdrop-blur-md shadow-[0_0_40px_rgba(6,182,212,0.25)]">
          <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{groupName}</div>
              <div className="text-[10px] font-mono text-slate-400">{mates.length} crew · visible to the whole squad</div>
            </div>
            <button type="button" onClick={() => toggle(false)} aria-label="Minimise squad chat" title="Minimise"
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"><Minus className="w-4 h-4" /></button>
          </header>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm" role="log" aria-live="polite">
            {msgs.length === 0 && <p className="text-xs text-slate-500 text-center mt-6">No messages yet. Say hello to your crew.</p>}
            {msgs.map(m => m.kind === 'system' ? (
              <div key={m.id} className="text-[11px] text-center text-slate-500 font-mono">{m.body}</div>
            ) : (
              <div key={m.id} className={`flex flex-col ${m.sender_id === me ? 'items-end' : 'items-start'}`}>
                <div className="text-[10px] text-slate-500 flex gap-1">
                  <span>{m.sender_id === me ? 'You' : nameOf(m.sender_id)}</span>
                  {mates.find(x => x.id === m.sender_id)?.roles[0] && <span className="text-cyan-300/70">· {crewRole(mates.find(x => x.id === m.sender_id)!.roles[0])?.short}</span>}
                  <span>· {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 break-words ${m.sender_id === me ? 'bg-cyan-400 text-slate-950 rounded-br-sm' : 'bg-white/10 text-slate-100 rounded-bl-sm'}`}>{m.body}</div>
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="p-2 border-t border-white/10">
            {err && <div role="alert" className="mb-1 text-[11px] text-rose-300">{err}</div>}
            <div className="flex gap-2">
              <input value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder="Message your squad…" aria-label="Message"
                className="flex-1 min-w-0 rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60" />
              <button type="submit" disabled={!text.trim() || sending} aria-label="Send message" className="rounded-xl px-3 bg-cyan-400 text-slate-950 disabled:opacity-40"><Send className="w-4 h-4" /></button>
            </div>
          </form>
        </section>
      )}
      {!open && (
        <button type="button" onClick={() => toggle(true)} aria-label={`Open squad chat${unread ? `, ${unread} unread` : ''}`} title="Squad chat"
          className="pointer-events-auto relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
          <Users className="w-6 h-6" aria-hidden />
          {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{unread}</span>}
        </button>
      )}
    </div>
  );
}
