-- =============================================================================
-- Mission Control: Beyond Earth — squad game v2
--
--   1. Squads hold 2–4 pilots (was 3). A squad MISSION needs at least 2.
--   2. 20 crew roles (replaces the 4 legacy roles). A member can hold several
--      roles; every role has exactly one owner; roles nobody holds fall to the leader.
--   3. squad_games   — one shared, server-authoritative mission room per
--                      squad + mission (URL: /squad/<squad id>/<mission id>).
--   4. squad_messages — group chat for the squad (saved, realtime).
--   5. Role-gated RPCs: only the role that owns a duty can perform it.
--   6. squad_game_claim — server-side reward for every member from the shared result.
--
-- Apply after 20261111120000_crew_roles.sql. Safe to run more than once.
-- =============================================================================

-- ── 1. Role catalogue ───────────────────────────────────────────────────────

create or replace function private.all_crew_roles()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'mission_commander', 'mission_director', 'mission_planner', 'project_manager', 'risk_manager',
    'aerospace_engineer', 'mechanical_engineer', 'electrical_engineer', 'software_engineer', 'thermal_engineer',
    'science_officer', 'planetary_scientist', 'data_scientist', 'robotics_engineer', 'research_scientist',
    'flight_director', 'flight_controller', 'navigation_officer', 'propulsion_engineer', 'communication_officer'
  ]::text[];
$$;

create or replace function private.crew_role_label(r text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case r
    when 'mission_commander'     then 'Mission Commander'
    when 'mission_director'      then 'Mission Director'
    when 'mission_planner'       then 'Mission Planner'
    when 'project_manager'       then 'Project Manager'
    when 'risk_manager'          then 'Risk Manager'
    when 'aerospace_engineer'    then 'Aerospace Engineer'
    when 'mechanical_engineer'   then 'Mechanical Engineer'
    when 'electrical_engineer'   then 'Electrical Engineer'
    when 'software_engineer'     then 'Software Engineer'
    when 'thermal_engineer'      then 'Thermal Engineer'
    when 'science_officer'       then 'Science Officer'
    when 'planetary_scientist'   then 'Planetary Scientist'
    when 'data_scientist'        then 'Data Scientist'
    when 'robotics_engineer'     then 'Robotics Engineer'
    when 'research_scientist'    then 'Research Scientist'
    when 'flight_director'       then 'Flight Director'
    when 'flight_controller'     then 'Flight Controller and Astronaut'
    when 'navigation_officer'    then 'Navigation Officer'
    when 'propulsion_engineer'   then 'Propulsion Engineer'
    when 'communication_officer' then 'Communication Officer'
  end;
$$;
revoke all on function private.all_crew_roles(), private.crew_role_label(text) from public;
grant execute on function private.all_crew_roles(), private.crew_role_label(text) to anon, authenticated;

-- ── 2. Migrate legacy role values, widen constraints ───────────────────────

alter table public.group_members     drop constraint if exists group_members_crew_role_check;
alter table public.group_invitations drop constraint if exists group_invitations_crew_role_check;

update public.group_members set crew_role = case crew_role
  when 'engineer' then 'aerospace_engineer' when 'scientist' then 'science_officer'
  when 'navigator' then 'navigation_officer' when 'comms' then 'communication_officer' else crew_role end
 where crew_role in ('engineer', 'scientist', 'navigator', 'comms');
update public.group_invitations set crew_role = case crew_role
  when 'engineer' then 'aerospace_engineer' when 'scientist' then 'science_officer'
  when 'navigator' then 'navigation_officer' when 'comms' then 'communication_officer' else crew_role end
 where crew_role in ('engineer', 'scientist', 'navigator', 'comms');

alter table public.group_members     alter column crew_role set default 'flight_controller';
alter table public.group_invitations alter column crew_role set default 'flight_controller';

alter table public.group_members add column if not exists crew_roles text[] not null default '{}';
update public.group_members set crew_roles = array[crew_role] where cardinality(crew_roles) = 0;
-- roles are exclusive: where legacy data gave the same role to two members, the earlier member keeps it
update public.group_members m
   set crew_roles = array(select r from unnest(m.crew_roles) r
                           where not exists (select 1 from public.group_members x
                                              where x.group_id = m.group_id and x.joined_at < m.joined_at and r = any (x.crew_roles)))
 where cardinality(m.crew_roles) > 0
   and exists (select 1 from public.group_members x, unnest(m.crew_roles) r
                where x.group_id = m.group_id and x.joined_at < m.joined_at and r = any (x.crew_roles));
-- every leader holds Mission Commander unless someone else already does
update public.group_members m
   set crew_roles = array_append(m.crew_roles, 'mission_commander')
 where m.role = 'leader'
   and not ('mission_commander' = any (m.crew_roles))
   and not exists (select 1 from public.group_members x where x.group_id = m.group_id and 'mission_commander' = any (x.crew_roles));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'group_members_crew_role_check') then
    alter table public.group_members add constraint group_members_crew_role_check
      check (private.crew_role_label(crew_role) is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'group_invitations_crew_role_check') then
    alter table public.group_invitations add constraint group_invitations_crew_role_check
      check (private.crew_role_label(crew_role) is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'group_members_crew_roles_check') then
    alter table public.group_members add constraint group_members_crew_roles_check
      check (crew_roles <@ private.all_crew_roles());
  end if;
end;
$$;

-- Defaults for new rows: leaders become Mission Commander; others hold the role they were invited as
create or replace function private.init_member_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'leader' and cardinality(new.crew_roles) = 0 then
    new.crew_role := 'mission_commander';
    new.crew_roles := array['mission_commander'];
  elsif cardinality(new.crew_roles) = 0 then
    new.crew_roles := array[new.crew_role];
  end if;
  return new;
end;
$$;
drop trigger if exists group_members_init_roles on public.group_members;
create trigger group_members_init_roles before insert on public.group_members
  for each row execute function private.init_member_roles();

-- ── 3. Squad capacity: 4 ───────────────────────────────────────────────────

create or replace function private.enforce_group_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.groups g where g.id = new.group_id for update;
  if (select count(*) from public.group_members m where m.group_id = new.group_id) >= 4 then
    raise exception 'GROUP_FULL' using hint = 'Squads are limited to 4 members.';
  end if;
  return new;
end;
$$;

create or replace function public.invite_to_group(p_invitee uuid, p_crew_role text default 'flight_controller')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := private.require_uid();
  gid   uuid;
  gname text;
  me    text;
  inv   uuid;
begin
  if p_crew_role is null or private.crew_role_label(p_crew_role) is null then raise exception 'INVALID_CREW_ROLE'; end if;
  select m.group_id into gid from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP' using hint = 'Create or join a squad first.'; end if;
  if p_invitee = uid then raise exception 'CANNOT_INVITE_SELF'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_invitee) then raise exception 'PLAYER_NOT_FOUND'; end if;
  if exists (select 1 from public.group_members m where m.player_id = p_invitee and m.group_id = gid) then
    raise exception 'ALREADY_MEMBER';
  end if;

  select g.name into gname from public.groups g where g.id = gid for update;
  if (select count(*) from public.group_members m where m.group_id = gid) >= 4 then
    raise exception 'GROUP_FULL' using hint = 'Squads are limited to 4 members.';
  end if;

  update public.group_invitations set status = 'expired'
   where group_id = gid and invitee_id = p_invitee and status = 'pending' and expires_at <= now();
  if exists (select 1 from public.group_invitations i
             where i.group_id = gid and i.invitee_id = p_invitee and i.status = 'pending') then
    raise exception 'INVITE_ALREADY_PENDING';
  end if;

  insert into public.group_invitations (group_id, inviter_id, invitee_id, crew_role)
  values (gid, uid, p_invitee, p_crew_role) returning id into inv;

  select p.display_name into me from public.profiles p where p.id = uid;
  perform private.notify(p_invitee, 'invite', 'Squad invitation',
    me || ' invited you to join ' || gname || ' as ' || private.crew_role_label(p_crew_role),
    jsonb_build_object('invitation_id', inv, 'group_id', gid, 'crew_role', p_crew_role));
  return inv;
end;
$$;

create or replace function public.respond_to_invitation(p_invitation uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := private.require_uid();
  inv   public.group_invitations;
  me    text;
  gname text;
  rec   record;
begin
  select * into inv from public.group_invitations where id = p_invitation for update;
  if not found or inv.invitee_id <> uid then raise exception 'INVITATION_NOT_FOUND'; end if;
  if inv.status <> 'pending' then raise exception 'INVITATION_CLOSED'; end if;
  if inv.expires_at <= now() then
    update public.group_invitations set status = 'expired', responded_at = now() where id = inv.id;
    return 'expired';
  end if;
  select p.display_name into me from public.profiles p where p.id = uid;

  if not p_accept then
    update public.group_invitations set status = 'declined', responded_at = now() where id = inv.id;
    perform private.notify(inv.inviter_id, 'invite_declined', 'Invitation declined', me || ' declined your squad invitation', jsonb_build_object('group_id', inv.group_id));
    return 'declined';
  end if;

  if exists (select 1 from public.group_members m where m.player_id = uid) then
    raise exception 'ALREADY_IN_GROUP' using hint = 'Leave your current squad before accepting.';
  end if;
  select g.name into gname from public.groups g where g.id = inv.group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if (select count(*) from public.group_members m where m.group_id = inv.group_id) >= 4 then
    update public.group_invitations set status = 'expired', responded_at = now() where id = inv.id;
    raise exception 'GROUP_FULL' using hint = 'This squad already has 4 members.';
  end if;

  -- the invited role is exclusive: it moves to the newcomer
  update public.group_members set crew_roles = array_remove(crew_roles, inv.crew_role) where group_id = inv.group_id;
  insert into public.group_members (group_id, player_id, role, crew_role, crew_roles)
  values (inv.group_id, uid, 'member', inv.crew_role, array[inv.crew_role]);
  update public.group_invitations set status = 'accepted', responded_at = now() where id = inv.id;
  update public.group_invitations set status = 'cancelled', responded_at = now()
   where invitee_id = uid and status = 'pending' and id <> inv.id;

  for rec in select m.player_id from public.group_members m where m.group_id = inv.group_id and m.player_id <> uid loop
    perform private.notify(rec.player_id, 'member_joined', 'New squad member', me || ' joined ' || gname || ' as ' || private.crew_role_label(inv.crew_role), jsonb_build_object('group_id', inv.group_id));
  end loop;
  return 'accepted';
end;
$$;

-- ── 4. Role assignment (leader only, exclusive roles) ───────────────────────

drop function if exists public.set_crew_role(uuid, text);

-- Move ONE role to a player (appends to what they already hold)
create or replace function public.set_crew_role(p_player uuid, p_crew_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  gid  uuid;
  lead boolean;
  me   text;
begin
  if p_crew_role is null or private.crew_role_label(p_crew_role) is null then raise exception 'INVALID_CREW_ROLE'; end if;
  select m.group_id, m.role = 'leader' into gid, lead from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP'; end if;
  if not lead then raise exception 'NOT_GROUP_LEADER'; end if;
  if not exists (select 1 from public.group_members m where m.group_id = gid and m.player_id = p_player) then raise exception 'NOT_A_MEMBER'; end if;
  update public.group_members set crew_roles = array_remove(crew_roles, p_crew_role) where group_id = gid;
  update public.group_members set crew_roles = array_append(crew_roles, p_crew_role), crew_role = p_crew_role
   where group_id = gid and player_id = p_player;
  if p_player <> uid then
    select p.display_name into me from public.profiles p where p.id = uid;
    perform private.notify(p_player, 'crew_role', 'New crew role', me || ' assigned you as ' || private.crew_role_label(p_crew_role), jsonb_build_object('group_id', gid, 'crew_role', p_crew_role));
  end if;
end;
$$;

-- Set the whole crew plan at once. p_assignments = {"<player uuid>": ["role", ...], ...}
create or replace function public.set_crew_roles(p_assignments jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := private.require_uid();
  gid   uuid;
  lead  boolean;
  me    text;
  key   text;
  roles text[];
  seen  text[] := '{}';
  r     text;
  cnt   integer;
begin
  select m.group_id, m.role = 'leader' into gid, lead from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP'; end if;
  if not lead then raise exception 'NOT_GROUP_LEADER'; end if;
  if jsonb_typeof(p_assignments) <> 'object' then raise exception 'INVALID_ASSIGNMENT'; end if;

  select count(*) into cnt from public.group_members m where m.group_id = gid;
  if (select count(*) from jsonb_object_keys(p_assignments)) <> cnt then raise exception 'INCOMPLETE_ASSIGNMENT'; end if;

  for key in select * from jsonb_object_keys(p_assignments) loop
    if not exists (select 1 from public.group_members m where m.group_id = gid and m.player_id::text = key) then raise exception 'NOT_A_MEMBER'; end if;
    select coalesce(array_agg(x), '{}') into roles from jsonb_array_elements_text(p_assignments -> key) x;
    foreach r in array roles loop
      if private.crew_role_label(r) is null then raise exception 'INVALID_CREW_ROLE'; end if;
      if r = any (seen) then raise exception 'DUPLICATE_ROLE'; end if;
      seen := array_append(seen, r);
    end loop;
  end loop;

  select p.display_name into me from public.profiles p where p.id = uid;
  for key in select * from jsonb_object_keys(p_assignments) loop
    select coalesce(array_agg(x), '{}') into roles from jsonb_array_elements_text(p_assignments -> key) x;
    update public.group_members m
       set crew_roles = roles,
           crew_role = coalesce(roles[1], m.crew_role)
     where m.group_id = gid and m.player_id::text = key and m.crew_roles is distinct from roles;
    if found and key <> uid::text then
      perform private.notify(key::uuid, 'crew_role', 'Crew roles updated',
        me || ' set your roles: ' || coalesce((select string_agg(private.crew_role_label(x), ', ') from unnest(roles) x), 'none'),
        jsonb_build_object('group_id', gid));
    end if;
  end loop;
end;
$$;

-- ── 5. Squad games ──────────────────────────────────────────────────────────

create table if not exists public.squad_games (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.groups (id) on delete cascade,
  mission_id       text not null references public.missions (id),
  group_mission_id uuid references public.group_missions (id) on delete set null,
  created_by       uuid not null references public.profiles (id),
  status           text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  state            jsonb not null,
  version          integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  ended_at         timestamptz
);
create unique index if not exists squad_games_one_active on public.squad_games (group_id, mission_id) where status = 'active';
create index if not exists squad_games_group_idx on public.squad_games (group_id, created_at desc);

create table if not exists public.squad_messages (
  id         bigint generated always as identity primary key,
  group_id   uuid not null references public.groups (id) on delete cascade,
  sender_id  uuid references public.profiles (id) on delete set null,
  kind       text not null default 'chat' check (kind in ('chat', 'system')),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists squad_messages_group_idx on public.squad_messages (group_id, id desc);

alter table public.squad_games    enable row level security;
alter table public.squad_messages enable row level security;
revoke all on public.squad_games, public.squad_messages from anon, authenticated;
grant select on public.squad_games, public.squad_messages to authenticated;

drop policy if exists "squad game visible to squad" on public.squad_games;
create policy "squad game visible to squad" on public.squad_games for select to authenticated
  using (group_id = (select private.my_group_id()));
drop policy if exists "squad chat visible to squad" on public.squad_messages;
create policy "squad chat visible to squad" on public.squad_messages for select to authenticated
  using (group_id = (select private.my_group_id()));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'squad_games') then
      alter publication supabase_realtime add table public.squad_games;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'squad_messages') then
      alter publication supabase_realtime add table public.squad_messages;
    end if;
  end if;
end;
$$;

-- ── Role helpers (mirror src/lib/squad/permissions.ts) ──────────────────────

-- Roles a member can act as: their own, plus (leader only) every role nobody holds
create or replace function private.squad_effective_roles(gid uuid, uid uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m      public.group_members;
  held   text[];
  taken  text[];
begin
  select * into m from public.group_members x where x.group_id = gid and x.player_id = uid;
  if not found then return '{}'; end if;
  held := m.crew_roles;
  if m.role = 'leader' then
    select coalesce(array_agg(distinct r), '{}') into taken
      from public.group_members x, unnest(x.crew_roles) r where x.group_id = gid;
    held := held || array(select r from unnest(private.all_crew_roles()) r where not (r = any (taken)));
  end if;
  return held;
end;
$$;

create or replace function private.squad_action_roles(a text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case a
    when 'briefing.approve'  then array['mission_commander']
    when 'budget.adjust'     then array['mission_director']
    when 'plan.trajectory'   then array['mission_planner']
    when 'build.launcher'    then array['aerospace_engineer']
    when 'build.finalize'    then array['aerospace_engineer']
    when 'launch.authorize'  then array['mission_commander']
    when 'launch.go'         then array['flight_director']
    when 'launch.wx'         then array['flight_director']
    when 'launch.waiver'     then array['risk_manager']
    when 'launch.commit'     then array['flight_controller']
    when 'launch.scrub'      then array['flight_controller', 'flight_director']
    when 'sim.sync'          then array['flight_director']
    when 'mission.finish'    then array['flight_director']
    when 'mission.abort'     then array['mission_commander']
  end;
$$;

create or replace function private.squad_component_role(cid text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when cid like 'nasa-inst-%' then 'planetary_scientist'
    when cid like 'struct-%'    then 'mechanical_engineer'
    when cid like 'cam-%'       then 'science_officer'
    when cid like 'inst-%'      then 'research_scientist'
    when cid like 'pwr-%'       then 'electrical_engineer'
    when cid like 'comm-%'      then 'communication_officer'
    when cid like 'prop-%'      then 'propulsion_engineer'
    when cid like 'therm-%'     then 'thermal_engineer'
    when cid like 'nav-%'       then 'navigation_officer'
  end;
$$;

create or replace function private.squad_event_roles(eid text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case eid
    when 'evt-solar-storm'       then array['risk_manager', 'science_officer', 'electrical_engineer']
    when 'evt-comm-drop'         then array['communication_officer', 'software_engineer']
    when 'evt-power-fault'       then array['electrical_engineer', 'thermal_engineer']
    when 'evt-anomaly-discovery' then array['planetary_scientist', 'research_scientist', 'data_scientist', 'science_officer']
    when 'evt-debris-impact'     then array['mechanical_engineer', 'aerospace_engineer', 'robotics_engineer']
  end;
$$;

create or replace function private.squad_ops(op text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case op
    when 'contingency'   then jsonb_build_object('role', 'mission_director',   'max', 99, 'minP', 5,  'maxP', 100, 'spend', 25)
    when 'milestone'     then jsonb_build_object('role', 'project_manager',    'max', 3,  'minP', 25, 'maxP', 100, 'spend', 0)
    when 'risk_review'   then jsonb_build_object('role', 'risk_manager',       'max', 3,  'minP', 10, 'maxP', 100, 'spend', 0)
    when 'course_correct' then jsonb_build_object('role', 'navigation_officer', 'max', 2,  'minP', 15, 'maxP', 80,  'spend', 0)
    when 'analyze'       then jsonb_build_object('role', 'data_scientist',     'max', 3,  'minP', 20, 'maxP', 100, 'spend', 0)
    when 'deploy'        then jsonb_build_object('role', 'robotics_engineer',  'max', 2,  'minP', 75, 'maxP', 100, 'spend', 0)
    when 'patch'         then jsonb_build_object('role', 'software_engineer',  'max', 2,  'minP', 10, 'maxP', 100, 'spend', 0)
  end;
$$;

revoke all on function private.squad_effective_roles(uuid, uuid), private.squad_action_roles(text), private.squad_component_role(text),
  private.squad_event_roles(text), private.squad_ops(text) from public;
grant execute on function private.squad_effective_roles(uuid, uuid), private.squad_action_roles(text), private.squad_component_role(text),
  private.squad_event_roles(text), private.squad_ops(text) to anon, authenticated;

-- System line in the squad chat
create or replace function private.squad_say(gid uuid, body text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.squad_messages (group_id, sender_id, kind, body) values (gid, null, 'system', left(body, 500));
$$;
revoke all on function private.squad_say(uuid, text) from public;

-- Append to the in-state activity log (kept to the last 40 entries)
create or replace function private.squad_log(st jsonb, uid uuid, txt text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me   text;
  logs jsonb := coalesce(st -> 'log', '[]'::jsonb);
begin
  select p.display_name into me from public.profiles p where p.id = uid;
  logs := logs || jsonb_build_array(jsonb_build_object('at', (extract(epoch from now()) * 1000)::bigint, 'by', coalesce(me, 'Crew'), 'text', left(txt, 200)));
  if jsonb_array_length(logs) > 40 then
    select jsonb_agg(e order by i) into logs
      from jsonb_array_elements(logs) with ordinality t(e, i)
     where i > jsonb_array_length(logs) - 40;
  end if;
  return jsonb_set(st, '{log}', logs);
end;
$$;
revoke all on function private.squad_log(jsonb, uuid, text) from public;

-- ── Create / abandon a squad game ───────────────────────────────────────────

create or replace function public.create_squad_game(p_mission text, p_budget numeric, p_components text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := private.require_uid();
  gid   uuid;
  lead  boolean;
  ms    public.missions;
  g     uuid;
  gm    uuid;
  n     integer;
  c     text;
  me    text;
  rec   record;
begin
  select m.group_id, m.role = 'leader' into gid, lead from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP'; end if;
  if not lead then raise exception 'NOT_GROUP_LEADER'; end if;
  select * into ms from public.missions where id = p_mission;
  if not found then raise exception 'MISSION_NOT_FOUND'; end if;
  perform 1 from public.groups x where x.id = gid for update;
  select count(*) into n from public.group_members m where m.group_id = gid;
  if n < 2 then raise exception 'SQUAD_TOO_SMALL' using hint = 'A squad mission needs at least 2 crew members.'; end if;

  select s.id into g from public.squad_games s where s.group_id = gid and s.mission_id = p_mission and s.status = 'active';
  if g is not null then return g; end if;  -- resume the running game

  if p_budget is null or p_budget < 50 or p_budget > 3000 then raise exception 'INVALID_BUDGET'; end if;
  foreach c in array coalesce(p_components, '{}') loop
    if private.squad_component_role(c) is null then raise exception 'INVALID_COMPONENT'; end if;
  end loop;

  update public.group_missions set status = 'closed' where group_id = gid and status = 'open' and closes_at <= now();
  select x.id into gm from public.group_missions x where x.group_id = gid and x.mission_id = p_mission and x.status = 'open';
  if gm is null then
    insert into public.group_missions (group_id, mission_id, created_by) values (gid, p_mission, uid) returning id into gm;
  end if;

  insert into public.squad_games (group_id, mission_id, group_mission_id, created_by, state)
  values (gid, p_mission, gm, uid, jsonb_build_object(
    'v', 1, 'stage', 'briefing',
    'baseBudgetM', round(p_budget), 'budgetM', round(p_budget), 'costM', 0, 'reserveSpentM', 0,
    'selectedComponentIds', to_jsonb(coalesce(p_components, '{}')),
    'selectedLauncherId', 'launch-medium', 'selectedTrajectoryId', 'hohmann',
    'launch', jsonb_build_object('phase', 'idle'),
    'sim', null, 'cmds', '[]'::jsonb, 'cmdSeq', 0, 'ops', '{}'::jsonb, 'result', null, 'log', '[]'::jsonb))
  returning id into g;

  select p.display_name into me from public.profiles p where p.id = uid;
  for rec in select m.player_id from public.group_members m where m.group_id = gid and m.player_id <> uid loop
    perform private.notify(rec.player_id, 'group_mission', 'Squad mission room open', me || ' opened ' || ms.name || '. Take your station!',
      jsonb_build_object('group_mission_id', gm, 'mission_id', p_mission, 'squad_game_id', g));
  end loop;
  perform private.squad_say(gid, me || ' opened the mission room for ' || ms.name || '. Check your roles and get to your stations.');
  return g;
end;
$$;

create or replace function public.abandon_squad_game(p_game uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_uid();
  g   public.squad_games;
begin
  select * into g from public.squad_games where id = p_game for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if not exists (select 1 from public.group_members m where m.group_id = g.group_id and m.player_id = uid and m.role = 'leader') then
    raise exception 'NOT_GROUP_LEADER';
  end if;
  if g.status <> 'active' then return; end if;
  update public.squad_games set status = 'abandoned', ended_at = now(), updated_at = now(), version = version + 1 where id = g.id;
  update public.group_missions set status = 'closed' where id = g.group_mission_id;
  perform private.squad_say(g.group_id, 'The leader abandoned the mission room.');
end;
$$;

-- ── The role-gated action endpoint ──────────────────────────────────────────
-- Every change to a running squad game goes through here. The database checks
-- (1) membership, (2) the caller's effective roles, (3) the game stage, and
-- (4) per-mission limits — so a modified client cannot do another role's job.

create or replace function public.squad_game_act(p_game uuid, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := private.require_uid();
  g      public.squad_games;
  st     jsonb;
  stage  text;
  held   text[];
  need   text[];
  launch jsonb;
  cid    text;
  on_    boolean;
  arr    jsonb;
  seq    integer;
  p      numeric;
  prob   numeric;
  rnd    numeric;
  def    jsonb;
  op     text;
  uses   integer;
  prog   numeric;
  spend  numeric;
  eid    text;
  me     text;
  note   text;
  res_status text;
  say    text;
begin
  select * into g from public.squad_games where id = p_game for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if not exists (select 1 from public.group_members m where m.group_id = g.group_id and m.player_id = uid) then raise exception 'NOT_A_MEMBER'; end if;
  if g.status <> 'active' then raise exception 'GAME_CLOSED'; end if;

  st := g.state;
  stage := st ->> 'stage';
  held := private.squad_effective_roles(g.group_id, uid);
  select p2.display_name into me from public.profiles p2 where p2.id = uid;

  -- role gate for simple actions
  need := private.squad_action_roles(p_action);
  if need is not null and not (need && held) then
    raise exception 'ROLE_REQUIRED' using hint = 'Needs: ' || (select string_agg(private.crew_role_label(x), ' / ') from unnest(need) x);
  end if;

  case p_action

    when 'briefing.approve' then
      if stage <> 'briefing' then raise exception 'WRONG_STAGE'; end if;
      st := jsonb_set(st, '{stage}', '"builder"');
      note := 'approved the mission plan — spacecraft design is open';

    when 'budget.adjust' then
      if stage not in ('briefing', 'builder', 'launcher_trajectory') then raise exception 'WRONG_STAGE'; end if;
      p := (p_payload ->> 'budgetM')::numeric;
      if p is null then raise exception 'INVALID_PAYLOAD'; end if;
      p := round(least(greatest(p, (st ->> 'baseBudgetM')::numeric * 0.7), (st ->> 'baseBudgetM')::numeric * 1.3) / 5) * 5;
      st := jsonb_set(st, '{budgetM}', to_jsonb(p));
      note := 'set the budget cap to $' || p || 'M';

    when 'plan.trajectory' then
      if stage not in ('briefing', 'builder', 'launcher_trajectory') then raise exception 'WRONG_STAGE'; end if;
      if (p_payload ->> 'id') not in ('direct', 'hohmann', 'fast') then raise exception 'INVALID_PAYLOAD'; end if;
      st := jsonb_set(st, '{selectedTrajectoryId}', to_jsonb(p_payload ->> 'id'));
      note := 'selected the ' || (p_payload ->> 'id') || ' trajectory';

    when 'build.toggle' then
      if stage <> 'builder' then raise exception 'WRONG_STAGE'; end if;
      cid := p_payload ->> 'componentId';
      on_ := coalesce((p_payload ->> 'on')::boolean, false);
      if cid is null or cid !~ '^[a-z0-9-]{3,40}$' or private.squad_component_role(cid) is null then raise exception 'INVALID_COMPONENT'; end if;
      if not (private.squad_component_role(cid) = any (held)) then
        raise exception 'ROLE_REQUIRED' using hint = 'Needs: ' || private.crew_role_label(private.squad_component_role(cid));
      end if;
      arr := st -> 'selectedComponentIds';
      arr := coalesce((select jsonb_agg(e) from jsonb_array_elements(arr) e where e #>> '{}' <> cid), '[]'::jsonb);
      if on_ then arr := arr || to_jsonb(cid); end if;
      st := jsonb_set(st, '{selectedComponentIds}', arr);
      note := case when on_ then 'installed ' else 'removed ' end || cid;

    when 'build.launcher' then
      if stage not in ('builder', 'launcher_trajectory') then raise exception 'WRONG_STAGE'; end if;
      if (p_payload ->> 'id') !~ '^launch-[a-z0-9-]{2,20}$' then raise exception 'INVALID_PAYLOAD'; end if;
      st := jsonb_set(st, '{selectedLauncherId}', to_jsonb(p_payload ->> 'id'));
      note := 'selected launch vehicle ' || (p_payload ->> 'id');

    when 'build.finalize' then
      if stage <> 'builder' then raise exception 'WRONG_STAGE'; end if;
      if coalesce((p_payload ->> 'valid')::boolean, false) is not true then raise exception 'BUILD_INVALID' using hint = 'The build has open problems (mass, power, budget or missing subsystems).'; end if;
      st := jsonb_set(st, '{costM}', to_jsonb(least(greatest(coalesce((p_payload ->> 'costM')::numeric, 0), 0), 5000)));
      st := jsonb_set(st, '{stage}', '"launcher_trajectory"');
      note := 'froze the spacecraft build and integrated it with the rocket';

    when 'launch.authorize' then
      if stage <> 'launcher_trajectory' then raise exception 'WRONG_STAGE'; end if;
      if coalesce((p_payload ->> 'valid')::boolean, false) is not true then raise exception 'BUILD_INVALID' using hint = 'Spacecraft does not fit the chosen launch vehicle.'; end if;
      st := jsonb_set(st, '{costM}', to_jsonb(least(greatest(coalesce((p_payload ->> 'costM')::numeric, (st ->> 'costM')::numeric), 0), 5000)));
      st := jsonb_set(st, '{stage}', '"launch"');
      st := jsonb_set(st, '{launch}', jsonb_build_object('phase', 'idle'));
      note := 'authorised the launch campaign — crew to the pad';

    when 'launch.wx' then
      if stage <> 'launch' then raise exception 'WRONG_STAGE'; end if;
      if (p_payload ->> 'scenario') not in ('live', 'clear', 'windy', 'rain', 'storm') then raise exception 'INVALID_PAYLOAD'; end if;
      launch := coalesce(st -> 'launch', '{}'::jsonb);
      if launch ->> 'phase' = 'counting' then raise exception 'WRONG_STAGE'; end if;
      st := jsonb_set(st, '{launch}', launch || jsonb_build_object('wxScenario', p_payload ->> 'scenario', 'phase', 'idle'));
      note := 'switched the weather source to ' || (p_payload ->> 'scenario');

    when 'launch.go' then
      if stage <> 'launch' then raise exception 'WRONG_STAGE'; end if;
      launch := coalesce(st -> 'launch', '{}'::jsonb);
      if launch ->> 'phase' = 'counting' then raise exception 'WRONG_STAGE'; end if;
      if coalesce((p_payload ->> 'go')::boolean, false) then
        if (p_payload #>> '{wx,overall}') not in ('GO', 'MARGINAL', 'NO-GO') then raise exception 'INVALID_PAYLOAD'; end if;
        if (p_payload #>> '{wx,overall}') = 'NO-GO' and coalesce((launch ->> 'waiver')::boolean, false) is not true then
          raise exception 'WEATHER_NO_GO' using hint = 'Weather is NO-GO. The Risk Manager must grant a waiver first.';
        end if;
        prob := least(greatest(coalesce((p_payload #>> '{wx,p}')::numeric, 0.012), 0.005), 0.97);
        launch := launch || jsonb_build_object('phase', 'go', 'goBy', me, 'wx', jsonb_build_object(
          'overall', p_payload #>> '{wx,overall}', 'p', prob, 'cause', left(coalesce(p_payload #>> '{wx,cause}', ''), 120),
          'summary', left(coalesce(p_payload #>> '{wx,summary}', ''), 200)));
        note := 'declared GO for launch (' || (p_payload #>> '{wx,overall}') || ' weather, ' || round(prob * 100) || '% loss risk)';
      else
        launch := launch || jsonb_build_object('phase', 'nogo');
        note := 'declared NO-GO';
      end if;
      st := jsonb_set(st, '{launch}', launch);

    when 'launch.waiver' then
      if stage <> 'launch' then raise exception 'WRONG_STAGE'; end if;
      launch := coalesce(st -> 'launch', '{}'::jsonb);
      if launch ->> 'phase' = 'counting' then raise exception 'WRONG_STAGE'; end if;
      on_ := coalesce((p_payload ->> 'granted')::boolean, false);
      launch := launch || jsonb_build_object('waiver', on_);
      if not on_ and launch ->> 'phase' = 'go' and launch #>> '{wx,overall}' = 'NO-GO' then launch := launch || jsonb_build_object('phase', 'nogo'); end if;
      st := jsonb_set(st, '{launch}', launch);
      note := case when on_ then 'GRANTED a weather waiver — risk accepted' else 'withdrew the weather waiver' end;

    when 'launch.commit' then
      if stage <> 'launch' then raise exception 'WRONG_STAGE'; end if;
      launch := coalesce(st -> 'launch', '{}'::jsonb);
      if launch ->> 'phase' <> 'go' then raise exception 'NOT_CLEARED' using hint = 'The Flight Director has not declared GO.'; end if;
      prob := coalesce((launch #>> '{wx,p}')::numeric, 0.012);
      rnd := random();
      if prob >= 0.9 or rnd < prob then
        launch := launch || jsonb_build_object('outcome', 'failure', 'failAtT', 18 + floor(random() * 120)::int, 'cause', nullif(launch #>> '{wx,cause}', ''));
      else
        launch := launch || jsonb_build_object('outcome', 'nominal');
      end if;
      launch := launch || jsonb_build_object('phase', 'counting', 'startedAt', (extract(epoch from now()) * 1000)::bigint);
      st := jsonb_set(st, '{launch}', launch);
      note := 'pressed LAUNCH — T-10 and counting';

    when 'launch.scrub' then
      if stage <> 'launch' then raise exception 'WRONG_STAGE'; end if;
      launch := coalesce(st -> 'launch', '{}'::jsonb);
      if launch ->> 'phase' = 'counting' then raise exception 'WRONG_STAGE'; end if;
      st := jsonb_set(st, '{launch}', launch || jsonb_build_object('phase', 'idle'));
      note := 'scrubbed the launch attempt';

    when 'launch.finish' then
      -- any crew console may report the end of the ascent animation, but not before it could have played
      if stage <> 'launch' then raise exception 'WRONG_STAGE'; end if;
      launch := coalesce(st -> 'launch', '{}'::jsonb);
      if launch ->> 'phase' <> 'counting' then raise exception 'WRONG_STAGE'; end if;
      if (extract(epoch from now()) * 1000) - (launch ->> 'startedAt')::numeric < 12000 then raise exception 'TOO_EARLY'; end if;
      if launch ->> 'outcome' = 'failure' then
        if pg_column_size(p_payload) > 30000 then raise exception 'INVALID_PAYLOAD'; end if;
        st := jsonb_set(st, '{result}', jsonb_build_object('status', 'FAILURE', 'science', 0, 'fuelPct', 0, 'riskPct', 100,
              'cause', launch ->> 'cause', 'debrief', p_payload -> 'debrief'));
        st := jsonb_set(st, '{stage}', '"debrief"');
        update public.squad_games set status = 'completed', ended_at = now() where id = g.id;
        update public.group_missions set status = 'closed' where id = g.group_mission_id;
        note := 'LOST THE VEHICLE: ' || coalesce(launch ->> 'cause', 'launch failure');
      else
        st := jsonb_set(st, '{stage}', '"mission_control"');
        note := 'reached orbit — handing over to Mission Control';
      end if;

    when 'sim.sync' then
      if stage <> 'mission_control' then raise exception 'WRONG_STAGE'; end if;
      if pg_column_size(p_payload) > 40000 then raise exception 'INVALID_PAYLOAD'; end if;
      st := jsonb_set(st, '{sim}', coalesce(p_payload -> 'sim', 'null'::jsonb));
      seq := coalesce((p_payload ->> 'ack')::int, 0);
      st := jsonb_set(st, '{cmds}', coalesce((select jsonb_agg(c) from jsonb_array_elements(st -> 'cmds') c where (c ->> 'id')::int > seq), '[]'::jsonb));
      note := null;

    when 'event.resolve' then
      if stage <> 'mission_control' then raise exception 'WRONG_STAGE'; end if;
      eid := p_payload ->> 'eventId';
      need := private.squad_event_roles(eid);
      if need is null then raise exception 'INVALID_PAYLOAD'; end if;
      if (st #>> '{sim,activeEventId}') is distinct from eid then raise exception 'WRONG_STAGE'; end if;
      if not (need && held) then
        raise exception 'ROLE_REQUIRED' using hint = 'Needs: ' || (select string_agg(private.crew_role_label(x), ' / ') from unnest(need) x);
      end if;
      seq := coalesce((st ->> 'cmdSeq')::int, 0) + 1;
      st := jsonb_set(st, '{cmdSeq}', to_jsonb(seq));
      st := jsonb_set(st, '{cmds}', coalesce(st -> 'cmds', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
            'id', seq, 'kind', 'event', 'eventId', eid, 'optionIndex', least(greatest(coalesce((p_payload ->> 'optionIndex')::int, 0), 0), 5), 'by', me)));
      note := 'chose response #' || (coalesce((p_payload ->> 'optionIndex')::int, 0) + 1) || ' for the ' || replace(replace(eid, 'evt-', ''), '-', ' ') || ' event';

    when 'ops.run' then
      if stage <> 'mission_control' then raise exception 'WRONG_STAGE'; end if;
      op := p_payload ->> 'op';
      def := private.squad_ops(op);
      if def is null then raise exception 'INVALID_PAYLOAD'; end if;
      if not ((def ->> 'role') = any (held)) then raise exception 'ROLE_REQUIRED' using hint = 'Needs: ' || private.crew_role_label(def ->> 'role'); end if;
      prog := coalesce((st #>> '{sim,missionProgress}')::numeric, 0);
      if prog < (def ->> 'minP')::numeric or prog > (def ->> 'maxP')::numeric then raise exception 'NOT_AVAILABLE' using hint = 'Not available at this point of the flight.'; end if;
      uses := coalesce((st #>> array['ops', op])::int, 0);
      if uses >= (def ->> 'max')::int then raise exception 'LIMIT_REACHED'; end if;
      spend := (def ->> 'spend')::numeric;
      if spend > 0 and ((st ->> 'budgetM')::numeric - (st ->> 'costM')::numeric - coalesce((st ->> 'reserveSpentM')::numeric, 0)) < spend then
        raise exception 'NO_FUNDS' using hint = 'Not enough unspent budget.';
      end if;
      st := jsonb_set(st, array['ops', op], to_jsonb(uses + 1), true);
      st := jsonb_set(st, '{reserveSpentM}', to_jsonb(coalesce((st ->> 'reserveSpentM')::numeric, 0) + spend));
      seq := coalesce((st ->> 'cmdSeq')::int, 0) + 1;
      st := jsonb_set(st, '{cmdSeq}', to_jsonb(seq));
      st := jsonb_set(st, '{cmds}', coalesce(st -> 'cmds', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', seq, 'kind', 'ops', 'op', op, 'by', me)));
      note := 'ran ' || replace(op, '_', ' ');

    when 'mission.abort' then
      if stage <> 'mission_control' then raise exception 'WRONG_STAGE'; end if;
      seq := coalesce((st ->> 'cmdSeq')::int, 0) + 1;
      st := jsonb_set(st, '{cmdSeq}', to_jsonb(seq));
      st := jsonb_set(st, '{cmds}', coalesce(st -> 'cmds', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', seq, 'kind', 'abort', 'by', me)));
      note := 'ordered a MISSION ABORT';

    when 'mission.finish' then
      if stage <> 'mission_control' then raise exception 'WRONG_STAGE'; end if;
      res_status := upper(coalesce(p_payload ->> 'status', ''));
      if res_status not in ('SUCCESS', 'PARTIAL', 'FAILURE') then raise exception 'INVALID_STATUS'; end if;
      if pg_column_size(p_payload) > 40000 then raise exception 'INVALID_PAYLOAD'; end if;
      st := jsonb_set(st, '{result}', jsonb_build_object(
            'status', res_status,
            'science', least(greatest(coalesce((p_payload ->> 'science')::numeric, 0), 0), 1000),
            'fuelPct', least(greatest(coalesce((p_payload ->> 'fuelPct')::numeric, 0), 0), 100),
            'riskPct', least(greatest(coalesce((p_payload ->> 'riskPct')::numeric, 100), 0), 100),
            'cause', left(coalesce(p_payload ->> 'cause', ''), 160),
            'debrief', p_payload -> 'debrief'));
      st := jsonb_set(st, '{stage}', '"debrief"');
      update public.squad_games set status = 'completed', ended_at = now() where id = g.id;
      update public.group_missions set status = 'closed' where id = g.group_mission_id;
      note := 'mission ended: ' || res_status;

    else
      raise exception 'UNKNOWN_ACTION';
  end case;

  if note is not null then
    st := private.squad_log(st, uid, note);
    -- the important beats are mirrored into the squad chat so everyone sees who did what
    perform private.squad_say(g.group_id, me || ' ' || note);
  end if;

  update public.squad_games set state = st, version = version + 1, updated_at = now() where id = g.id;
  return jsonb_build_object('version', g.version + 1, 'stage', st ->> 'stage');
end;
$$;

-- ── Chat ───────────────────────────────────────────────────────────────────

create or replace function public.send_squad_message(p_body text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  gid  uuid;
  body text := btrim(coalesce(p_body, ''));
  mid  bigint;
begin
  select m.group_id into gid from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP'; end if;
  if char_length(body) < 1 or char_length(body) > 500 then raise exception 'INVALID_MESSAGE'; end if;
  if (select count(*) from public.squad_messages x where x.sender_id = uid and x.created_at > now() - interval '6 seconds') >= 8 then
    raise exception 'RATE_LIMITED';
  end if;
  insert into public.squad_messages (group_id, sender_id, body) values (gid, uid, body) returning id into mid;
  return mid;
end;
$$;

-- ── Rewards: every member claims from the shared, server-stored result ──────

create or replace function public.squad_game_claim(p_game uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_uid();
  g   public.squad_games;
  r   jsonb;
  run uuid;
  prev public.mission_results;
begin
  select * into g from public.squad_games where id = p_game;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if not exists (select 1 from public.group_members m where m.group_id = g.group_id and m.player_id = uid) then raise exception 'NOT_A_MEMBER'; end if;
  if g.status <> 'completed' or g.state -> 'result' is null or jsonb_typeof(g.state -> 'result') <> 'object' then raise exception 'GAME_NOT_FINISHED'; end if;

  -- already claimed: return the stored result instead of failing
  select x.* into prev from public.mission_results x where x.group_mission_id = g.group_mission_id and x.player_id = uid;
  if found then
    return jsonb_build_object('status', prev.status, 'science', prev.science, 'score', prev.score, 'credits', prev.credits_awarded,
      'xp', prev.xp_awarded, 'squad_bonus', prev.squad_bonus, 'achievements', '[]'::jsonb, 'already', true,
      'totals', (select jsonb_build_object('credits', s.credits, 'xp', s.xp, 'science', s.science_total, 'rank', public.rank_for_xp(s.xp))
                   from public.player_statistics s where s.player_id = uid));
  end if;

  insert into public.mission_runs (player_id, mission_id, group_mission_id, state, started_at)
  values (uid, g.mission_id, g.group_mission_id, 'active', g.created_at) returning id into run;
  update public.player_statistics set missions_started = missions_started + 1, updated_at = now() where player_id = uid;
  perform private.grant_achievement(uid, 'first-launch');

  r := g.state -> 'result';
  return public.complete_mission(run, r ->> 'status', (r ->> 'science')::numeric, (r ->> 'fuelPct')::numeric, (r ->> 'riskPct')::numeric);
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function
  public.invite_to_group(uuid, text), public.respond_to_invitation(uuid, boolean),
  public.set_crew_role(uuid, text), public.set_crew_roles(jsonb),
  public.create_squad_game(text, numeric, text[]), public.abandon_squad_game(uuid),
  public.squad_game_act(uuid, text, jsonb), public.send_squad_message(text), public.squad_game_claim(uuid)
  from public, anon;
grant execute on function
  public.invite_to_group(uuid, text), public.respond_to_invitation(uuid, boolean),
  public.set_crew_role(uuid, text), public.set_crew_roles(jsonb),
  public.create_squad_game(text, numeric, text[]), public.abandon_squad_game(uuid),
  public.squad_game_act(uuid, text, jsonb), public.send_squad_message(text), public.squad_game_claim(uuid)
  to authenticated;
