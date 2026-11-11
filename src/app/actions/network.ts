'use server';

/**
 * Server Actions for the multiplayer layer. Each action verifies the session
 * server-side (getClaims) and then calls a database RPC that re-checks
 * authorization with auth.uid(). No client-supplied player IDs, credits or
 * scores are trusted.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { friendlyError, type ActionResult } from '@/lib/network/errors';
import { CREW_ROLE_IDS } from '@/lib/network/crewRoles';

async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub ?? null;
  return { supabase, uid };
}

const uuid = z.uuid();
const avatar = z.string().regex(/^[a-z]{3,12}-[a-z]{3,12}$/);
const missionId = z.enum(['mission-01', 'mission-02', 'mission-03', 'mission-04']);

export interface PlayerSearchResult {
  id: string;
  player_code: string;
  username: string;
  display_name: string;
  avatar: string;
  rank: string;
  missions_completed: number | null;
  science_total: number | null;
  group_code: string | null;
  group_name: string | null;
  in_my_group: boolean;
  invite_pending: boolean;
}

export async function searchPlayersAction(query: string): Promise<ActionResult<PlayerSearchResult[]>> {
  // Public: visitors may search; results contain public card fields only
  const { supabase, uid } = await authed();
  const q = String(query ?? '').slice(0, 40);
  if (q.trim().length < 2) return { ok: true, data: [] };
  const { data, error } = await supabase.rpc('search_players', { q, max_results: 12 });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, data: (data ?? []).filter((r: PlayerSearchResult) => r.id !== uid) };
}

export async function updateProfileAction(input: {
  displayName: string; avatar: string; bio: string; showStats: boolean; showHistory: boolean; showGroup: boolean;
}): Promise<ActionResult> {
  const { supabase, uid } = await authed();
  if (!uid) return { ok: false, error: friendlyError({ message: 'NOT_AUTHENTICATED' }) };
  const parsed = z.object({
    displayName: z.string().trim().min(2).max(32),
    avatar,
    bio: z.string().trim().max(160),
    showStats: z.boolean(), showHistory: z.boolean(), showGroup: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Display name must be 2–32 characters; bio up to 160.' };
  const v = parsed.data;
  // RLS + column grants restrict this to the caller's own row and these columns only
  const { error } = await supabase.from('profiles').update({
    display_name: v.displayName, avatar: v.avatar, bio: v.bio || null,
    show_stats: v.showStats, show_history: v.showHistory, show_group: v.showGroup,
  }).eq('id', uid);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath('/profile');
  return { ok: true, data: undefined };
}

async function rpc<T>(fn: string, args: Record<string, unknown>, paths: string[] = ['/squad']): Promise<ActionResult<T>> {
  const { supabase, uid } = await authed();
  if (!uid) return { ok: false, error: friendlyError({ message: 'NOT_AUTHENTICATED' }) };
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: friendlyError(error) };
  paths.forEach(p => revalidatePath(p));
  return { ok: true, data: data as T };
}

export async function createGroupAction(input: { name: string; description: string; emblem: string; specialization: string | null }) {
  const parsed = z.object({
    name: z.string().trim().min(3).max(32),
    description: z.string().trim().max(200),
    emblem: avatar,
    specialization: z.enum(['MOON', 'MARS', 'NEO', 'EO', 'DEEP']).nullable(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Squad name must be 3–32 characters.' } as const;
  const v = parsed.data;
  return rpc<{ id: string; group_code: string }>('create_group', {
    p_name: v.name, p_description: v.description, p_emblem: v.emblem, p_specialization: v.specialization,
  });
}

export async function updateGroupAction(input: { name: string; description: string; emblem: string; specialization: string | null }) {
  const parsed = z.object({
    name: z.string().trim().min(3).max(32), description: z.string().trim().max(200), emblem: avatar,
    specialization: z.enum(['MOON', 'MARS', 'NEO', 'EO', 'DEEP']).nullable(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Squad name must be 3–32 characters.' } as const;
  const v = parsed.data;
  return rpc('update_group', { p_name: v.name, p_description: v.description, p_emblem: v.emblem, p_specialization: v.specialization });
}

const crewRoleSchema = z.enum(CREW_ROLE_IDS);

export async function invitePlayerAction(playerId: string, crewRole: string = 'engineer') {
  if (!uuid.safeParse(playerId).success) return { ok: false, error: 'Player not found.' } as const;
  if (!crewRoleSchema.safeParse(crewRole).success) return { ok: false, error: 'Choose a crew role.' } as const;
  return rpc<string>('invite_to_group', { p_invitee: playerId, p_crew_role: crewRole }, ['/squad', '/players']);
}

export async function setCrewRoleAction(playerId: string, crewRole: string) {
  if (!uuid.safeParse(playerId).success) return { ok: false, error: 'Player not found.' } as const;
  if (!crewRoleSchema.safeParse(crewRole).success) return { ok: false, error: 'Choose a crew role.' } as const;
  return rpc('set_crew_role', { p_player: playerId, p_crew_role: crewRole });
}

export async function respondInvitationAction(invitationId: string, accept: boolean) {
  if (!uuid.safeParse(invitationId).success) return { ok: false, error: 'Invitation not found.' } as const;
  return rpc<string>('respond_to_invitation', { p_invitation: invitationId, p_accept: accept }, ['/squad', '/notifications', '/profile']);
}

export async function cancelInvitationAction(invitationId: string) {
  if (!uuid.safeParse(invitationId).success) return { ok: false, error: 'Invitation not found.' } as const;
  return rpc('cancel_invitation', { p_invitation: invitationId });
}

export async function leaveGroupAction() {
  return rpc<string>('leave_group', {}, ['/squad', '/profile']);
}

export async function removeMemberAction(playerId: string) {
  if (!uuid.safeParse(playerId).success) return { ok: false, error: 'Player not found.' } as const;
  return rpc('remove_group_member', { p_player: playerId });
}

export async function transferLeadershipAction(playerId: string) {
  if (!uuid.safeParse(playerId).success) return { ok: false, error: 'Player not found.' } as const;
  return rpc('transfer_group_leadership', { p_player: playerId });
}

export async function createGroupMissionAction(mission: string) {
  if (!missionId.safeParse(mission).success) return { ok: false, error: 'Unknown mission.' } as const;
  return rpc<string>('create_group_mission', { p_mission: mission });
}

export async function markNotificationsReadAction(ids: string[] | 'all') {
  const { supabase, uid } = await authed();
  if (!uid) return { ok: false, error: friendlyError({ message: 'NOT_AUTHENTICATED' }) } as const;
  let query = supabase.from('player_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids !== 'all') {
    const valid = ids.filter(i => uuid.safeParse(i).success);
    if (!valid.length) return { ok: true, data: undefined } as const;
    query = query.in('id', valid);
  }
  const { error } = await query; // RLS limits this to the caller's notifications
  if (error) return { ok: false, error: friendlyError(error) } as const;
  revalidatePath('/notifications');
  return { ok: true, data: undefined } as const;
}

export async function deleteNotificationAction(id: string) {
  const { supabase, uid } = await authed();
  if (!uid || !uuid.safeParse(id).success) return { ok: false, error: 'Not allowed.' } as const;
  const { error } = await supabase.from('player_notifications').delete().eq('id', id);
  if (error) return { ok: false, error: friendlyError(error) } as const;
  revalidatePath('/notifications');
  return { ok: true, data: undefined } as const;
}

// ── Mission runs (called from the game client) ──

export async function startMissionRunAction(mission: string, groupMissionId: string | null): Promise<ActionResult<string>> {
  if (!missionId.safeParse(mission).success) return { ok: false, error: 'Unknown mission.' };
  if (groupMissionId && !uuid.safeParse(groupMissionId).success) return { ok: false, error: 'Squad mission not found.' };
  return rpc<string>('start_mission', { p_mission: mission, p_group_mission: groupMissionId }, []);
}

export interface VerifiedMissionResult {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
  science: number;
  score: number;
  credits: number;
  xp: number;
  squad_bonus: number;
  achievements: string[];
  totals: { credits: number; xp: number; science: number; rank: string };
}

export async function completeMissionRunAction(input: {
  runId: string; status: string; science: number; fuelPct: number; riskPct: number;
}): Promise<ActionResult<VerifiedMissionResult>> {
  const parsed = z.object({
    runId: uuid,
    status: z.enum(['SUCCESS', 'PARTIAL', 'FAILURE']),
    science: z.number().finite(), fuelPct: z.number().finite(), riskPct: z.number().finite(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid mission report.' };
  const v = parsed.data;
  // The database clamps and recomputes everything; these are only the simulation's raw readings.
  return rpc<VerifiedMissionResult>('complete_mission', {
    p_run: v.runId, p_status: v.status, p_science: v.science, p_fuel_pct: v.fuelPct, p_risk_pct: v.riskPct,
  }, ['/profile', '/leaderboard', '/squad']);
}
