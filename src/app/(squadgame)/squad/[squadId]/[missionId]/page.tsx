import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient, getVerifiedUserId } from '@/lib/supabase/server';
import { MISSIONS } from '@/data/missions';
import { CREW_ROLE_IDS } from '@/lib/network/crewRoles';
import { effectiveRoles } from '@/lib/squad/permissions';
import { evaluateTeam } from '@/lib/squad/teamLogic';
import type { SquadCtx, SquadGameRow } from '@/lib/squad/types';
import { GameShell } from '@/components/game/GameShell';
import { SquadLobby } from '@/components/squadgame/SquadLobby';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Squad mission room' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#02040b] text-slate-100 p-6">
      <div className="max-w-md rounded-2xl glass-panel p-6 text-center">
        <h1 className="font-display text-xl text-white">{title}</h1>
        <div className="mt-2 text-sm text-slate-400">{children}</div>
        <Link href="/squad" className="mt-5 inline-block cta-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950">Back to squad</Link>
      </div>
    </main>
  );
}

/** /squad/<squad id or code>/<mission id> — the shared mission room. */
export default async function SquadMissionRoom({ params, searchParams }: {
  params: Promise<{ squadId: string; missionId: string }>;
  searchParams: Promise<{ game?: string }>;
}) {
  const { squadId, missionId } = await params;
  const { game: wantedGame } = await searchParams;
  const here = `/squad/${squadId}/${missionId}`;

  const uid = await getVerifiedUserId();
  if (!uid) redirect(`/login?next=${encodeURIComponent(here)}&reason=mission`);

  const mission = MISSIONS.find(m => m.id === missionId);
  if (!mission) notFound();

  const supabase = await createClient();
  const byId = UUID.test(squadId);
  const { data: group } = await supabase.from('groups').select('id, group_code, name')
    .eq(byId ? 'id' : 'group_code', byId ? squadId : squadId.toUpperCase()).maybeSingle();
  if (!group) return <Notice title="Squad not found">That squad does not exist, or you are not a member of it.</Notice>;

  const { data: rows } = await supabase.from('group_members')
    .select('player_id, role, crew_roles, joined_at, profile:profiles(display_name)').eq('group_id', group.id).order('joined_at');
  const members = (rows ?? []).map(m => {
    const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return { player_id: m.player_id as string, role: m.role as 'leader' | 'member', crew_roles: (m.crew_roles ?? []) as string[], name: (p?.display_name as string) ?? 'Pilot' };
  });
  if (!members.some(m => m.player_id === uid)) return <Notice title="Not your squad">Only members of {group.name} can enter its mission room.</Notice>;

  const { data: games } = await supabase.from('squad_games').select('id, group_id, mission_id, status, state, version')
    .eq('group_id', group.id).eq('mission_id', missionId).order('created_at', { ascending: false }).limit(6);
  const list = (games ?? []) as unknown as SquadGameRow[];
  const row = wantedGame ? list.find(g => g.id === wantedGame) : list.find(g => g.status === 'active');

  const leader = members.find(m => m.role === 'leader')!;
  const assignment = Object.fromEntries(members.map(m => [m.player_id, m.crew_roles]));
  const evaluation = evaluateTeam(assignment, members.map(m => m.player_id), leader.player_id);

  if (!row) {
    const last = list.find(g => g.status === 'completed');
    return (
      <SquadLobby
        squadId={group.id} squadName={group.name} mission={{ id: mission.id, name: mission.name, code: mission.code, budget: mission.budget }}
        isLeader={leader.player_id === uid} memberCount={members.length}
        members={members.map(m => ({ id: m.player_id, name: m.name, leader: m.role === 'leader', roles: m.crew_roles, effective: [...effectiveRoles(m.player_id, members, CREW_ROLE_IDS)] }))}
        evaluation={evaluation} lastGame={last ? { id: last.id, status: last.state.result?.status ?? 'FAILURE' } : null}
      />
    );
  }

  const memberCtx = members.map(m => ({ id: m.player_id, name: m.name, leader: m.role === 'leader', roles: m.crew_roles, effective: [...effectiveRoles(m.player_id, members, CREW_ROLE_IDS)] }));
  const host = memberCtx.find(m => m.effective.includes('flight_director')) ?? memberCtx.find(m => m.leader)!;
  const mine = memberCtx.find(m => m.id === uid)!;
  const ctx: SquadCtx = {
    gameId: row.id, groupId: group.id, groupName: group.name, userId: uid, members: memberCtx,
    myRoles: mine.effective, isHost: host.id === uid, hostName: host.name, bonus: evaluation.bonus,
  };
  return <GameShell squad={{ ctx, row }} />;
}
