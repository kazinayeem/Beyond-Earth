/**
 * Server-side data loaders (call from Server Components only). Reads go through
 * the per-request Supabase client, so every query is filtered by RLS as the
 * signed-in player.
 */
import { createClient } from '@/lib/supabase/server';

export interface Profile {
  id: string;
  player_code: string;
  username: string;
  display_name: string;
  avatar: string;
  bio: string | null;
  show_stats: boolean;
  show_history: boolean;
  show_group: boolean;
  created_at: string;
}
export interface Stats {
  credits: number;
  xp: number;
  science_total: number;
  missions_started: number;
  missions_completed: number;
  missions_failed: number;
  group_missions_completed: number;
  best_score: number;
}
export interface Group {
  id: string;
  group_code: string;
  name: string;
  description: string | null;
  emblem: string;
  specialization: string | null;
  owner_id: string;
  credits: number;
  xp_total: number;
  science_total: number;
  missions_completed: number;
  created_at: string;
}
export interface Member { player_id: string; role: 'leader' | 'member'; joined_at: string; profile: Profile; stats: Stats | null }
export interface MissionResultRow {
  id: string; mission_id: string; status: 'SUCCESS' | 'PARTIAL' | 'FAILURE'; science: number; score: number;
  credits_awarded: number; xp_awarded: number; squad_bonus: number; completed_at: string; group_id: string | null; group_mission_id: string | null; player_id: string;
}
export interface Achievement { id: string; title: string; description: string; icon: string; sort_order: number }
export interface NotificationRow {
  id: string; kind: string; title: string; body: string | null; payload: Record<string, string>; read_at: string | null; created_at: string;
}
export interface InvitationRow {
  id: string; status: string; created_at: string; expires_at: string;
  group: Pick<Group, 'id' | 'group_code' | 'name' | 'emblem' | 'specialization'> | null;
  inviter: Pick<Profile, 'id' | 'display_name' | 'player_code' | 'avatar'> | null;
  invitee: Pick<Profile, 'id' | 'display_name' | 'player_code' | 'avatar'> | null;
}

type Supa = Awaited<ReturnType<typeof createClient>>;

async function currentUserId(supabase: Supa) {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function getMe() {
  const supabase = await createClient();
  const uid = await currentUserId(supabase);
  if (!uid) return null;
  const [{ data: profile }, { data: stats }, { data: membership }, { count: unread }, { count: invites }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('player_statistics').select('*').eq('player_id', uid).maybeSingle(),
    supabase.from('group_members').select('role, group:groups(id, group_code, name, emblem)').eq('player_id', uid).maybeSingle(),
    supabase.from('player_notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    supabase.from('group_invitations').select('id', { count: 'exact', head: true }).eq('invitee_id', uid).eq('status', 'pending'),
  ]);
  if (!profile) return { uid, profile: null, stats: null, group: null, role: null, unread: 0, invites: 0 };
  return {
    uid,
    profile: profile as Profile,
    stats: stats as Stats | null,
    group: one(membership?.group as unknown as Pick<Group, 'id' | 'group_code' | 'name' | 'emblem'> | null),
    role: (membership?.role ?? null) as 'leader' | 'member' | null,
    unread: unread ?? 0,
    invites: invites ?? 0,
  };
}

export async function getPlayerDossier(by: { id?: string; code?: string }) {
  const supabase = await createClient();
  const uid = await currentUserId(supabase);
  let q = supabase.from('profiles').select('*');
  q = by.id ? q.eq('id', by.id) : q.eq('player_code', (by.code ?? '').toUpperCase());
  const { data: profile } = await q.maybeSingle();
  if (!profile) return null;
  const p = profile as Profile;
  const [{ data: stats }, { data: unlocked }, { data: catalog }, { data: results }, { data: membership }] = await Promise.all([
    supabase.from('player_statistics').select('*').eq('player_id', p.id).maybeSingle(),
    supabase.from('player_achievements').select('achievement_id, unlocked_at').eq('player_id', p.id),
    supabase.from('achievements').select('*').order('sort_order'),
    supabase.from('mission_results').select('*').eq('player_id', p.id).order('completed_at', { ascending: false }).limit(12),
    supabase.from('group_members').select('role, group:groups(id, group_code, name, emblem)').eq('player_id', p.id).maybeSingle(),
  ]);
  return {
    isMe: p.id === uid,
    viewerId: uid,
    profile: p,
    stats: stats as Stats | null, // null when the player keeps stats private
    achievements: (catalog ?? []) as Achievement[],
    unlocked: new Map((unlocked ?? []).map(a => [a.achievement_id as string, a.unlocked_at as string])),
    results: (results ?? []) as MissionResultRow[],
    group: one(membership?.group as unknown as Pick<Group, 'id' | 'group_code' | 'name' | 'emblem'> | null),
    role: (membership?.role ?? null) as string | null,
  };
}

export async function getSquadDashboard() {
  const supabase = await createClient();
  const uid = await currentUserId(supabase);
  if (!uid) return null;
  const { data: membership } = await supabase.from('group_members').select('group_id').eq('player_id', uid).maybeSingle();
  const { data: received } = await supabase
    .from('group_invitations')
    .select('id, status, created_at, expires_at, group:groups(id, group_code, name, emblem, specialization), inviter:profiles!group_invitations_inviter_id_fkey(id, display_name, player_code, avatar)')
    .eq('invitee_id', uid).eq('status', 'pending').order('created_at', { ascending: false });
  const receivedInvites = ((received ?? []) as unknown as InvitationRow[])
    .map(r => ({ ...r, group: one(r.group), inviter: one(r.inviter) }))
    .filter(r => new Date(r.expires_at) > new Date());

  if (!membership) return { uid, group: null, receivedInvites } as const;
  const gid = membership.group_id as string;
  const [{ data: group }, { data: members }, { data: sent }, { data: missions }, { data: results }, { data: board }] = await Promise.all([
    supabase.from('groups').select('*').eq('id', gid).single(),
    supabase.from('group_members').select('player_id, role, joined_at, profile:profiles(*)').eq('group_id', gid).order('joined_at'),
    supabase.from('group_invitations')
      .select('id, status, created_at, expires_at, invitee:profiles!group_invitations_invitee_id_fkey(id, display_name, player_code, avatar)')
      .eq('group_id', gid).eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('group_missions').select('id, mission_id, status, created_at, closes_at, created_by').eq('group_id', gid).order('created_at', { ascending: false }).limit(8),
    supabase.from('mission_results').select('*').eq('group_id', gid).order('completed_at', { ascending: false }).limit(15),
    supabase.rpc('get_group_leaderboard', { p_period: 'all', p_limit: 1 }),
  ]);
  const memberIds = (members ?? []).map(m => m.player_id as string);
  const { data: memberStats } = await supabase.from('player_statistics').select('*').in('player_id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);
  const statsBy = new Map((memberStats ?? []).map(s => [s.player_id as string, s as unknown as Stats]));
  const myRow = ((board ?? []) as { is_mine: boolean; rank: number }[]).find(r => r.is_mine);
  return {
    uid,
    group: group as Group,
    members: (members ?? []).map(m => ({ ...m, profile: one(m.profile) as Profile, stats: statsBy.get(m.player_id as string) ?? null })) as Member[],
    sentInvites: ((sent ?? []) as unknown as InvitationRow[]).map(r => ({ ...r, invitee: one(r.invitee) })),
    receivedInvites,
    missions: (missions ?? []) as { id: string; mission_id: string; status: string; created_at: string; closes_at: string; created_by: string }[],
    results: (results ?? []) as MissionResultRow[],
    leaderboardRank: myRow?.rank ?? null,
  } as const;
}

export async function getNotifications() {
  const supabase = await createClient();
  const { data } = await supabase.from('player_notifications').select('*').order('created_at', { ascending: false }).limit(60);
  return (data ?? []) as NotificationRow[];
}

export interface LeaderRow {
  rank: number; player_id: string; player_code: string; username: string; display_name: string; avatar: string;
  player_rank: string; value: number; science: number; missions: number; xp: number; credits: number; is_me: boolean;
}
export interface GroupLeaderRow {
  rank: number; group_id: string; group_code: string; name: string; emblem: string; members: number;
  xp: number; science: number; missions: number; credits: number; is_mine: boolean;
}

export async function getLeaderboard(category: string, period: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_leaderboard', { p_category: category, p_period: period, p_limit: 50 });
  return { rows: (data ?? []) as LeaderRow[], error: error?.message ?? null };
}

export async function getGroupLeaderboard(period: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_group_leaderboard', { p_period: period, p_limit: 50 });
  return { rows: (data ?? []) as GroupLeaderRow[], error: error?.message ?? null };
}
