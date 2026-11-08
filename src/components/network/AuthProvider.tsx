'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => { setUid(data.user?.id ?? null); load(data.user?.id ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setUid(session?.user?.id ?? null);
        load(session?.user?.id ?? null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

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
