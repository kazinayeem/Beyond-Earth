'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/store/gameStore';
import { fetchSquadGame } from './client';
import type { SquadGameRow, SquadGameState } from './types';

/**
 * Keeps the local store in step with the shared mission room:
 *  • Supabase Realtime pushes every change of the game row (instant),
 *  • a 3 s poll covers dropped sockets,
 *  • the Flight Director's console publishes the running simulation once a second.
 */
export function useSquadSync(gameId: string | null) {
  useEffect(() => {
    if (!gameId) return;
    const supabase = createClient();
    const apply = (row: Pick<SquadGameRow, 'state' | 'version' | 'status'>) => useGameStore.getState().applyRemoteSquad(row);

    const channel = supabase
      .channel(`squad-game-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'squad_games', filter: `id=eq.${gameId}` }, payload => {
        const n = payload.new as { state: SquadGameState; version: number; status: SquadGameRow['status'] };
        if (n?.state) apply(n);
      })
      .subscribe();

    let alive = true;
    const poll = async () => {
      const row = await fetchSquadGame(gameId);
      if (alive && row) apply(row);
    };
    const pollId = window.setInterval(poll, 3000);

    const pushId = window.setInterval(() => { void useGameStore.getState().pushSquadSim(); }, 1000);
    // publish an event the moment it starts / ends so the whole crew sees the modal without waiting a second
    const unsub = useGameStore.subscribe((s, prev) => {
      if (s.squad?.isHost && s.activeEvent?.id !== prev.activeEvent?.id) void s.pushSquadSim();
    });

    return () => {
      alive = false;
      window.clearInterval(pollId);
      window.clearInterval(pushId);
      unsub();
      void supabase.removeChannel(channel);
    };
  }, [gameId]);
}
