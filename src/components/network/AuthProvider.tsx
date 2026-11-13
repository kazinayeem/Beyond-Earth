'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface PlayerSummary {
  id: string;
  player_code: string;
  username: string;
  display_name: string;
  avatar: string;
  credits: number;
  xp: number;
  science_total: number;
  missions_completed: number;
}

interface AuthState {
  configured: boolean;
  status: 'loading' | 'signedIn' | 'signedOut';
  player: PlayerSummary | null;
  unread: number;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  configured: false, status: 'signedOut', player: null, unread: 0, refresh: async () => {},
});

/** Client-side view of the signed-in player (for nav, badges and the game HUD).
 *  Authorization never relies on this — server actions and RLS re-verify. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>(isSupabaseConfigured ? 'loading' : 'signedOut');
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [unread, setUnread] = useState(0);
  const [uid, setUid] = useState<string | null>(null);
  const pathname = usePathname();
  // undefined = not checked yet; lets sync() skip work when the session has not changed
  const knownUid = useRef<string | null | undefined>(undefined);

  const load = useCallback(async (userId: string | null) => {
    if (!isSupabaseConfigured) return;
    if (!userId) { setPlayer(null); setUnread(0); setStatus('signedOut'); return; }
    const supabase = createClient();
    const [{ data: profile }, { data: stats }, { count }] = await Promise.all([
      supabase.from('profiles').select('id, player_code, username, display_name, avatar').eq('id', userId).maybeSingle(),
      supabase.from('player_statistics').select('credits, xp, science_total, missions_completed').eq('player_id', userId).maybeSingle(),
      supabase.from('player_notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    ]);
    setPlayer(profile ? { ...profile, credits: stats?.credits ?? 0, xp: stats?.xp ?? 0, science_total: stats?.science_total ?? 0, missions_completed: stats?.missions_completed ?? 0 } as PlayerSummary : null);
    setUnread(count ?? 0);
    setStatus('signedIn');
  }, []);

  const apply = useCallback((userId: string | null, force = false) => {
    if (!force && knownUid.current === userId) return;
    knownUid.current = userId;
    setUid(userId);
    void load(userId);
  }, [load]);

  // Sign-in, sign-up and sign-out run as server actions: they set the auth cookies on the server, so the
  // browser client never fires onAuthStateChange. Re-read the session from the cookies (local, no network)
  // so the header and game see the new user without a page reload.
  const sync = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await createClient().auth.getSession();
    apply(data.session?.user?.id ?? null);
  }, [apply]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') apply(session?.user?.id ?? null);
      else if (event === 'USER_UPDATED') apply(session?.user?.id ?? null, true);
    });
    // another tab signed in or out
    const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { sub.subscription.unsubscribe(); document.removeEventListener('visibilitychange', onVisible); };
  }, [apply, sync]);

  // a server-action redirect (login → /profile, logout → /) changes the route without remounting this provider
  useEffect(() => { void sync(); }, [pathname, sync]);

  // Live notification badge (Realtime honours the RLS policy: only own rows arrive)
  useEffect(() => {
    if (!isSupabaseConfigured || !uid) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_notifications', filter: `recipient_id=eq.${uid}` }, () => {
        supabase.from('player_notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
          .then(({ count }) => setUnread(count ?? 0));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid]);

  const refresh = useCallback(async () => { await load(uid); }, [load, uid]);
  const value = useMemo(() => ({ configured: isSupabaseConfigured, status, player, unread, refresh }), [status, player, unread, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
