'use client';

import { createClient } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/network/errors';
import type { SquadGameRow } from './types';
import type { VerifiedMissionResult } from '@/app/actions/network';

export type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string; code: string };

function codeOf(err: { message?: string } | null): string {
  const m = (err?.message ?? '').match(/[A-Z][A-Z_]{3,}/);
  return m ? m[0] : 'ERROR';
}

/** Every squad-mission change goes through this single, server-authoritative RPC. */
export async function squadAct(gameId: string, action: string, payload: Record<string, unknown> = {}): Promise<Result<{ version: number; stage: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('squad_game_act', { p_game: gameId, p_action: action, p_payload: payload });
  if (error) return { ok: false, error: friendlyError(error), code: codeOf(error) };
  return { ok: true, data: data as { version: number; stage: string } };
}

export async function squadClaim(gameId: string): Promise<Result<VerifiedMissionResult>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('squad_game_claim', { p_game: gameId });
  if (error) return { ok: false, error: friendlyError(error), code: codeOf(error) };
  return { ok: true, data: data as VerifiedMissionResult };
}

export async function fetchSquadGame(gameId: string): Promise<SquadGameRow | null> {
  const supabase = createClient();
  const { data } = await supabase.from('squad_games').select('id, group_id, mission_id, status, state, version').eq('id', gameId).maybeSingle();
  return (data as SquadGameRow | null) ?? null;
}

export async function sendSquadMessage(body: string): Promise<Result<number>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('send_squad_message', { p_body: body });
  if (error) return { ok: false, error: friendlyError(error), code: codeOf(error) };
  return { ok: true, data: data as number };
}
