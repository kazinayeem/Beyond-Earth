-- =============================================================================
-- Mission Control: Beyond Earth — multiplayer core
--
-- Players, permanent player IDs, private 3-member squads, invitations,
-- notifications, server-validated mission results, leaderboards, achievements.
--
-- Security model
--   • RLS is enabled on every table in `public`.
--   • Clients may only UPDATE a few profile columns (column-level grants) and
--     mark their own notifications read. Everything else that changes game
--     state goes through SECURITY DEFINER RPC functions that check auth.uid()
--     in their body. Credits, XP, scores and rankings are computed here, never
--     accepted from the client.
--   • Internal helpers live in the non-exposed `private` schema.
-- =============================================================================

-- Re-run guard: when this file is pasted into the SQL editor a second time,
-- stop with a clear message instead of failing halfway on "already exists".
do $$
begin
  if to_regclass('public.profiles') is not null and to_regclass('public.mission_results') is not null then
    raise exception 'MULTIPLAYER_CORE_ALREADY_APPLIED'
      using hint = 'This migration is already in the database. Apply only the newer files in supabase/migrations/.';
  end if;
end;
$$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;  -- needed so RLS policies can call helper predicates

-- ── Utility functions ───────────────────────────────────────────────────────

-- Unambiguous alphabet (no 0/O/1/I) for human-readable codes
create or replace function private.random_code(len integer)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, len);
$$;

create or replace function public.rank_for_xp(xp integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when xp >= 10000 then 'Flight Director'
    when xp >= 4000  then 'Commander'
    when xp >= 1500  then 'Mission Pilot'
    when xp >= 500   then 'Specialist'
    else 'Cadet'
  end;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Catalog tables (public read-only) ──────────────────────────────────────

create table public.missions (
  id               text primary key,
  code             text not null unique,
  name             text not null,
  target           text not null,
  reward_credits   integer not null check (reward_credits >= 0),
  min_science      integer not null check (min_science > 0),
  science_cap      integer not null check (science_cap >= min_science),
  base_xp          integer not null check (base_xp >= 0),
  min_duration_sec integer not null default 60 check (min_duration_sec >= 0)
);

-- Mirrors src/data/missions.ts. science_cap = the most science a run can
-- plausibly report (client caps collection at 1.5× build potential).
insert into public.missions (id, code, name, target, reward_credits, min_science, science_cap, base_xp, min_duration_sec) values
  ('mission-01', 'ART-L1', 'Lunar Explorer',    'Moon',        1000,  70, 400, 300, 40),
  ('mission-02', 'MR-02',  'Mars Pathfinder',   'Mars',        2500, 110, 450, 600, 40),
  ('mission-03', 'NEO-3',  'Asteroid Surveyor', 'Asteroid',    4000, 140, 450, 800, 40),
  ('mission-04', 'EO-4',   'Earth Observer',    'Earth Orbit', 1500,  80, 400, 450, 40);

create table public.achievements (
  id          text primary key,
  title       text not null,
  description text not null,
  icon        text not null,
  sort_order  integer not null default 0
);

insert into public.achievements (id, title, description, icon, sort_order) values
  ('first-launch',       'First Launch',        'Start your first mission.',                              'Rocket',   1),
  ('lunar-explorer',     'Lunar Explorer',      'Complete the Lunar Explorer mission successfully.',      'Moon',     2),
  ('mars-pathfinder',    'Mars Pathfinder',     'Complete the Mars Pathfinder mission successfully.',     'Orbit',    3),
  ('deep-space-pioneer', 'Deep Space Pioneer',  'Complete the Asteroid Surveyor mission successfully.',   'Sparkles', 4),
  ('earth-sentinel',     'Earth Sentinel',      'Complete the Earth Observer mission successfully.',      'Globe',    5),
  ('master-engineer',    'Master Engineer',     'Finish any mission with a score of 90 or higher.',       'Wrench',   6),
  ('science-specialist', 'Science Specialist',  'Accumulate 500 science points across all missions.',     'FlaskConical', 7),
  ('squad-operative',    'Squad Operative',     'Complete a group mission with your squad.',              'Users',    8);

-- ── Players ────────────────────────────────────────────────────────────────

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  player_code  text not null unique check (player_code ~ '^MC-[2-9A-HJ-NP-Z]{6}$'),
  username     text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 32),
  avatar       text not null default 'orbit-cyan' check (avatar ~ '^[a-z]{3,12}-[a-z]{3,12}$'),
  bio          text check (bio is null or char_length(bio) <= 160),
  show_stats   boolean not null default true,
  show_history boolean not null default true,
  show_group   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index profiles_username_lower_key on public.profiles (lower(username));
create index profiles_username_prefix_idx on public.profiles (lower(username) text_pattern_ops);
create index profiles_display_prefix_idx on public.profiles (lower(display_name) text_pattern_ops);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Immutable identity columns (defense in depth on top of column grants)
create or replace function private.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.player_code <> old.player_code or new.username <> old.username
     or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_FIELD' using hint = 'Player ID, username and registration date cannot be changed.';
  end if;
  return new;
end;
$$;
create trigger profiles_protect before update on public.profiles
  for each row execute function private.protect_profile_identity();

create table public.player_statistics (
  player_id                uuid primary key references public.profiles (id) on delete cascade,
  credits                  integer not null default 1000 check (credits >= 0),
  xp                       integer not null default 0 check (xp >= 0),
  science_total            integer not null default 0 check (science_total >= 0),
  missions_started         integer not null default 0 check (missions_started >= 0),
  missions_completed       integer not null default 0 check (missions_completed >= 0),
  missions_failed          integer not null default 0 check (missions_failed >= 0),
  group_missions_completed integer not null default 0 check (group_missions_completed >= 0),
  best_score               integer not null default 0 check (best_score between 0 and 100),
  updated_at               timestamptz not null default now()
);
create index player_stats_xp_idx       on public.player_statistics (xp desc);
create index player_stats_science_idx  on public.player_statistics (science_total desc);
create index player_stats_missions_idx on public.player_statistics (missions_completed desc);
create index player_stats_credits_idx  on public.player_statistics (credits desc);

-- New auth user → profile + statistics, with a guaranteed-unique player code
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname  text  := lower(coalesce(meta ->> 'username', ''));
  dname  text  := btrim(coalesce(meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name', ''));
  code   text;
  tries  integer := 0;
begin
  -- metadata is user-supplied: only used for initial cosmetic values, never for authorization
  if uname !~ '^[a-z0-9_]{3,20}$'
     or exists (select 1 from public.profiles p where lower(p.username) = uname) then
    uname := 'pilot_' || lower(private.random_code(6));
  end if;
  if char_length(dname) < 2 then dname := uname; end if;
  dname := left(dname, 32);

  loop
    tries := tries + 1;
    code := 'MC-' || private.random_code(6);
    begin
      insert into public.profiles (id, player_code, username, display_name)
      values (new.id, code, uname, dname);
      exit;
    exception when unique_violation then
      if tries >= 12 then raise; end if;
      -- username collided in a race: fall back to a generated one
      if exists (select 1 from public.profiles p where lower(p.username) = uname) then
        uname := 'pilot_' || lower(private.random_code(6));
      end if;
    end;
  end loop;

  insert into public.player_statistics (player_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Squads ─────────────────────────────────────────────────────────────────

create table public.groups (
  id                 uuid primary key default gen_random_uuid(),
  group_code         text not null unique check (group_code ~ '^GRP-[A-Z]{2,4}-[2-9A-HJ-NP-Z]{4}$'),
  name               text not null check (char_length(btrim(name)) between 3 and 32),
  description        text check (description is null or char_length(description) <= 200),
  emblem             text not null default 'orbit-cyan' check (emblem ~ '^[a-z]{3,12}-[a-z]{3,12}$'),
  specialization     text check (specialization is null or specialization in ('MOON', 'MARS', 'NEO', 'EO', 'DEEP')),
  owner_id           uuid not null references public.profiles (id),
  credits            integer not null default 0 check (credits >= 0),
  xp_total           integer not null default 0 check (xp_total >= 0),
  science_total      integer not null default 0 check (science_total >= 0),
  missions_completed integer not null default 0 check (missions_completed >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index groups_owner_idx on public.groups (owner_id);
create index groups_xp_idx on public.groups (xp_total desc);
create index groups_science_idx on public.groups (science_total desc);
create trigger groups_touch before update on public.groups
  for each row execute function private.touch_updated_at();

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id),
  constraint group_members_one_group_per_player unique (player_id)
);

-- Hard capacity guard: serialises inserts per group and rejects a 4th member,
-- even if a caller somehow bypasses the RPC path.
create or replace function private.enforce_group_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.groups g where g.id = new.group_id for update;
  if (select count(*) from public.group_members m where m.group_id = new.group_id) >= 3 then
    raise exception 'GROUP_FULL' using hint = 'Squads are limited to 3 members.';
  end if;
  return new;
end;
$$;
create trigger group_members_capacity before insert on public.group_members
  for each row execute function private.enforce_group_capacity();

create table public.group_invitations (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  inviter_id   uuid not null references public.profiles (id) on delete cascade,
  invitee_id   uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  responded_at timestamptz,
  check (inviter_id <> invitee_id)
);
create unique index group_invitations_one_pending on public.group_invitations (group_id, invitee_id) where status = 'pending';
create index group_invitations_invitee_idx on public.group_invitations (invitee_id) where status = 'pending';
create index group_invitations_group_idx on public.group_invitations (group_id, created_at desc);

create table public.player_notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('invite', 'invite_accepted', 'invite_declined', 'member_joined', 'member_left',
                                             'member_removed', 'leadership', 'group_mission', 'mission_result', 'achievement', 'squad_bonus')),
  title        text not null,
  body         text,
  payload      jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index player_notifications_recipient_idx on public.player_notifications (recipient_id, created_at desc);
create index player_notifications_unread_idx on public.player_notifications (recipient_id) where read_at is null;

-- ── Missions ───────────────────────────────────────────────────────────────

create table public.group_missions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  mission_id  text not null references public.missions (id),
  created_by  uuid not null references public.profiles (id),
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  closes_at   timestamptz not null default now() + interval '7 days'
);
create unique index group_missions_one_open on public.group_missions (group_id, mission_id) where status = 'open';
create index group_missions_group_idx on public.group_missions (group_id, created_at desc);

-- One row per player attempt (a group mission's participants each have their own run)
create table public.mission_runs (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null references public.profiles (id) on delete cascade,
  mission_id       text not null references public.missions (id),
  group_mission_id uuid references public.group_missions (id) on delete set null,
  state            text not null default 'active' check (state in ('active', 'completed', 'abandoned')),
  started_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index mission_runs_player_idx on public.mission_runs (player_id, started_at desc);
create unique index mission_runs_one_per_group_mission on public.mission_runs (group_mission_id, player_id)
  where group_mission_id is not null and state <> 'abandoned';

create table public.mission_results (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null unique references public.mission_runs (id) on delete cascade,  -- one reward per run
  player_id        uuid not null references public.profiles (id) on delete cascade,
  mission_id       text not null references public.missions (id),
  group_id         uuid references public.groups (id) on delete set null,
  group_mission_id uuid references public.group_missions (id) on delete set null,
  status           text not null check (status in ('SUCCESS', 'PARTIAL', 'FAILURE')),
  science          integer not null check (science >= 0),
  score            integer not null check (score between 0 and 100),
  credits_awarded  integer not null check (credits_awarded >= 0),
  xp_awarded       integer not null check (xp_awarded >= 0),
  squad_bonus      integer not null default 0 check (squad_bonus >= 0),
  duration_sec     integer not null check (duration_sec >= 0),
  completed_at     timestamptz not null default now()
);
create index mission_results_completed_idx on public.mission_results (completed_at desc);
create index mission_results_player_idx on public.mission_results (player_id, completed_at desc);
create index mission_results_group_idx on public.mission_results (group_id, completed_at desc) where group_id is not null;
create index mission_results_group_mission_idx on public.mission_results (group_mission_id) where group_mission_id is not null;

create table public.player_achievements (
  player_id      uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  unlocked_at    timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

-- ── RLS helper predicates (private, SECURITY DEFINER, caller-scoped) ───────

create or replace function private.my_group_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.group_id from public.group_members m where m.player_id = (select auth.uid());
$$;

create or replace function private.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.player_id = (select auth.uid()));
$$;

create or replace function private.profile_flag(pid uuid, flag text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case flag
    when 'stats'   then p.show_stats
    when 'history' then p.show_history
    when 'group'   then p.show_group
    else false end
  from public.profiles p where p.id = pid;
$$;

revoke all on function private.random_code(integer), private.touch_updated_at(), private.protect_profile_identity(),
  private.handle_new_user(), private.enforce_group_capacity() from public;
revoke all on function private.my_group_id(), private.is_group_member(uuid), private.profile_flag(uuid, text) from public;
grant execute on function private.my_group_id(), private.is_group_member(uuid), private.profile_flag(uuid, text) to anon, authenticated;

create or replace function private.notify(recipient uuid, kind text, title text, body text, payload jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.player_notifications (recipient_id, kind, title, body, payload)
  values (recipient, kind, title, body, payload);
$$;
revoke all on function private.notify(uuid, text, text, text, jsonb) from public;

create or replace function private.grant_achievement(pid uuid, aid text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
begin
  insert into public.player_achievements (player_id, achievement_id) values (pid, aid)
  on conflict do nothing;
  if found then
    select a.title into t from public.achievements a where a.id = aid;
    perform private.notify(pid, 'achievement', 'Achievement unlocked', t, jsonb_build_object('achievement_id', aid));
    return true;
  end if;
  return false;
end;
$$;
revoke all on function private.grant_achievement(uuid, text) from public;

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Supabase grants broad table privileges to anon/authenticated by default;
-- reset them and grant exactly what the policies below are meant to allow.

alter table public.missions             enable row level security;
alter table public.achievements         enable row level security;
alter table public.profiles             enable row level security;
alter table public.player_statistics    enable row level security;
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.group_invitations    enable row level security;
alter table public.player_notifications enable row level security;
alter table public.group_missions       enable row level security;
alter table public.mission_runs         enable row level security;
alter table public.mission_results      enable row level security;
alter table public.player_achievements  enable row level security;

revoke all on public.missions, public.achievements, public.profiles, public.player_statistics, public.groups,
  public.group_members, public.group_invitations, public.player_notifications, public.group_missions,
  public.mission_runs, public.mission_results, public.player_achievements from anon, authenticated;

grant select on public.missions, public.achievements to anon, authenticated;
-- Public browsing (visitors can view pilots, squads and rankings; playing requires an account)
grant select on public.profiles, public.player_statistics, public.groups, public.group_members, public.mission_results,
  public.player_achievements to anon, authenticated;
grant select on public.group_invitations, public.player_notifications, public.group_missions, public.mission_runs to authenticated;
-- the only direct writes a client may perform:
grant update (display_name, avatar, bio, show_stats, show_history, show_group) on public.profiles to authenticated;
grant update (read_at) on public.player_notifications to authenticated;
grant delete on public.player_notifications to authenticated;

create policy "catalog readable" on public.missions for select to anon, authenticated using (true);
create policy "achievement catalog readable" on public.achievements for select to anon, authenticated using (true);

-- Public player cards (no email is stored in profiles at all)
create policy "profiles readable by everyone" on public.profiles for select to anon, authenticated using (true);
create policy "players edit own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "stats visible when public or own" on public.player_statistics for select to anon, authenticated
  using (player_id = (select auth.uid()) or (select private.profile_flag(player_id, 'stats')));

create policy "groups readable" on public.groups for select to anon, authenticated using (true);

create policy "membership visible" on public.group_members for select to anon, authenticated
  using (player_id = (select auth.uid())
         or group_id = (select private.my_group_id())
         or (select private.profile_flag(player_id, 'group')));

create policy "invitations visible to invitee and squad" on public.group_invitations for select to authenticated
  using (invitee_id = (select auth.uid()) or group_id = (select private.my_group_id()));

create policy "own notifications" on public.player_notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "mark own notifications read" on public.player_notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy "delete own notifications" on public.player_notifications for delete to authenticated
  using (recipient_id = (select auth.uid()));

create policy "squad missions visible to squad" on public.group_missions for select to authenticated
  using (group_id = (select private.my_group_id()));

create policy "own runs" on public.mission_runs for select to authenticated
  using (player_id = (select auth.uid()));

create policy "results visible when public, own or squad" on public.mission_results for select to anon, authenticated
  using (player_id = (select auth.uid())
         or (group_id is not null and group_id = (select private.my_group_id()))
         or (select private.profile_flag(player_id, 'history')));

create policy "achievements visible when stats public or own" on public.player_achievements for select to anon, authenticated
  using (player_id = (select auth.uid()) or (select private.profile_flag(player_id, 'stats')));

-- Live in-app notifications (Realtime respects the RLS policy above)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.player_notifications;
  end if;
end;
$$;

-- ── Public RPC API ─────────────────────────────────────────────────────────
-- Every function: SECURITY DEFINER, empty search_path, explicit auth.uid() check,
-- EXECUTE revoked from PUBLIC/anon and granted to authenticated only.

create or replace function private.require_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  return uid;
end;
$$;
revoke all on function private.require_uid() from public;
grant execute on function private.require_uid() to authenticated;

-- Username availability (used on the registration form, before an account exists)
create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(candidate) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles p where lower(p.username) = lower(candidate));
$$;

-- Player search by player ID, username or display name. Returns public fields only.
create or replace function public.search_players(q text, max_results integer default 12)
returns table (
  id uuid, player_code text, username text, display_name text, avatar text, rank text,
  missions_completed integer, science_total integer, group_code text, group_name text,
  in_my_group boolean, invite_pending boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());  -- null for visitors (read-only)
  term text := lower(btrim(coalesce(q, '')));
  mine uuid := private.my_group_id();
begin
  if char_length(term) < 2 then return; end if;
  term := replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_');
  return query
    select p.id, p.player_code, p.username, p.display_name, p.avatar,
           public.rank_for_xp(coalesce(s.xp, 0)),
           case when p.show_stats or p.id = uid then s.missions_completed else null end,
           case when p.show_stats or p.id = uid then s.science_total else null end,
           case when p.show_group or g.id = mine then g.group_code else null end,
           case when p.show_group or g.id = mine then g.name else null end,
           coalesce(mine is not null and m.group_id = mine, false),
           exists (select 1 from public.group_invitations i
                   where i.invitee_id = p.id and i.group_id = mine and i.status = 'pending' and i.expires_at > now())
    from public.profiles p
    left join public.player_statistics s on s.player_id = p.id
    left join public.group_members m on m.player_id = p.id
    left join public.groups g on g.id = m.group_id
    where lower(p.player_code) = term
       or lower(p.username) like term || '%'
       or lower(p.display_name) like term || '%'
       or lower(p.display_name) like '% ' || term || '%'
    order by (lower(p.player_code) = term) desc, (lower(p.username) = term) desc, s.xp desc nulls last
    limit least(greatest(max_results, 1), 25);
end;
$$;

-- Create a squad; the creator becomes leader.
create or replace function public.create_group(p_name text, p_description text default null, p_emblem text default 'orbit-cyan', p_specialization text default null)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  g    public.groups;
  tag  text := coalesce(nullif(upper(p_specialization), ''), 'CREW');
  tries integer := 0;
begin
  if exists (select 1 from public.group_members m where m.player_id = uid) then
    raise exception 'ALREADY_IN_GROUP' using hint = 'Leave your current squad before creating a new one.';
  end if;
  if p_specialization is not null and upper(p_specialization) not in ('MOON', 'MARS', 'NEO', 'EO', 'DEEP') then
    raise exception 'INVALID_SPECIALIZATION';
  end if;
  loop
    tries := tries + 1;
    begin
      insert into public.groups (group_code, name, description, emblem, specialization, owner_id)
      values ('GRP-' || tag || '-' || private.random_code(4), btrim(p_name), nullif(btrim(p_description), ''),
              coalesce(p_emblem, 'orbit-cyan'), nullif(upper(p_specialization), ''), uid)
      returning * into g;
      exit;
    exception when unique_violation then
      if tries >= 12 then raise; end if;
    end;
  end loop;
  insert into public.group_members (group_id, player_id, role) values (g.id, uid, 'leader');
  return g;
end;
$$;

-- Update squad details (leader only)
create or replace function public.update_group(p_name text, p_description text, p_emblem text, p_specialization text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_uid();
  g   public.groups;
begin
  select * into g from public.groups where owner_id = uid for update;
  if not found then raise exception 'NOT_GROUP_LEADER'; end if;
  if p_specialization is not null and upper(p_specialization) not in ('MOON', 'MARS', 'NEO', 'EO', 'DEEP') then
    raise exception 'INVALID_SPECIALIZATION';
  end if;
  update public.groups
     set name = btrim(p_name), description = nullif(btrim(p_description), ''),
         emblem = coalesce(p_emblem, emblem), specialization = nullif(upper(p_specialization), '')
   where id = g.id
   returning * into g;
  return g;
end;
$$;

-- Invite a player into the caller's squad (any squad member may invite)
create or replace function public.invite_to_group(p_invitee uuid)
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
  select m.group_id into gid from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP' using hint = 'Create or join a squad first.'; end if;
  if p_invitee = uid then raise exception 'CANNOT_INVITE_SELF'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_invitee) then raise exception 'PLAYER_NOT_FOUND'; end if;
  if exists (select 1 from public.group_members m where m.player_id = p_invitee and m.group_id = gid) then
    raise exception 'ALREADY_MEMBER';
  end if;

  -- lock the squad so capacity checks and invite inserts serialise
  select g.name into gname from public.groups g where g.id = gid for update;
  if (select count(*) from public.group_members m where m.group_id = gid) >= 3 then
    raise exception 'GROUP_FULL' using hint = 'Squads are limited to 3 members.';
  end if;

  -- expire stale invitations so they don't block a fresh one
  update public.group_invitations set status = 'expired'
   where group_id = gid and invitee_id = p_invitee and status = 'pending' and expires_at <= now();
  if exists (select 1 from public.group_invitations i
             where i.group_id = gid and i.invitee_id = p_invitee and i.status = 'pending') then
    raise exception 'INVITE_ALREADY_PENDING';
  end if;

  insert into public.group_invitations (group_id, inviter_id, invitee_id)
  values (gid, uid, p_invitee) returning id into inv;

  select p.display_name into me from public.profiles p where p.id = uid;
  perform private.notify(p_invitee, 'invite', 'Squad invitation',
    me || ' invited you to join ' || gname, jsonb_build_object('invitation_id', inv, 'group_id', gid));
  return inv;
end;
$$;

-- Accept or decline an invitation (invitee only). Capacity enforced under a row lock.
create or replace function public.respond_to_invitation(p_invitation uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  inv  public.group_invitations;
  me   text;
  gname text;
  rec  record;
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
  if (select count(*) from public.group_members m where m.group_id = inv.group_id) >= 3 then
    update public.group_invitations set status = 'expired', responded_at = now() where id = inv.id;
    raise exception 'GROUP_FULL' using hint = 'This squad already has 3 members.';
  end if;

  insert into public.group_members (group_id, player_id, role) values (inv.group_id, uid, 'member');
  update public.group_invitations set status = 'accepted', responded_at = now() where id = inv.id;
  -- one squad per player: withdraw the player's other open invitations
  update public.group_invitations set status = 'cancelled', responded_at = now()
   where invitee_id = uid and status = 'pending' and id <> inv.id;

  for rec in select m.player_id from public.group_members m where m.group_id = inv.group_id and m.player_id <> uid loop
    perform private.notify(rec.player_id, 'member_joined', 'New squad member', me || ' joined ' || gname, jsonb_build_object('group_id', inv.group_id));
  end loop;
  return 'accepted';
end;
$$;

-- Withdraw an invitation (inviter or squad leader)
create or replace function public.cancel_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_uid();
  inv public.group_invitations;
begin
  select * into inv from public.group_invitations where id = p_invitation for update;
  if not found or inv.status <> 'pending'
     or not (inv.inviter_id = uid or exists (select 1 from public.groups g where g.id = inv.group_id and g.owner_id = uid)) then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  update public.group_invitations set status = 'cancelled', responded_at = now() where id = inv.id;
end;
$$;

-- Leave the squad. A departing leader hands over to the longest-serving member;
-- the last member leaving dissolves the squad.
create or replace function public.leave_group()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  gid  uuid;
  heir uuid;
  me   text;
  rec  record;
begin
  select m.group_id into gid from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP'; end if;
  perform 1 from public.groups g where g.id = gid for update;
  delete from public.group_members where group_id = gid and player_id = uid;

  select m.player_id into heir from public.group_members m where m.group_id = gid order by m.joined_at limit 1;
  if heir is null then
    delete from public.groups where id = gid;
    return 'dissolved';
  end if;
  select p.display_name into me from public.profiles p where p.id = uid;
  if (select g.owner_id from public.groups g where g.id = gid) = uid then
    update public.groups set owner_id = heir where id = gid;
    update public.group_members set role = 'leader' where group_id = gid and player_id = heir;
    perform private.notify(heir, 'leadership', 'You now lead the squad', me || ' left and handed you leadership', jsonb_build_object('group_id', gid));
  end if;
  for rec in select m.player_id from public.group_members m where m.group_id = gid loop
    perform private.notify(rec.player_id, 'member_left', 'Squad member left', me || ' left the squad', jsonb_build_object('group_id', gid));
  end loop;
  return 'left';
end;
$$;

-- Remove a member (leader only)
create or replace function public.remove_group_member(p_player uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_uid();
  gid uuid;
begin
  select g.id into gid from public.groups g where g.owner_id = uid for update;
  if gid is null then raise exception 'NOT_GROUP_LEADER'; end if;
  if p_player = uid then raise exception 'USE_LEAVE_GROUP'; end if;
  delete from public.group_members where group_id = gid and player_id = p_player;
  if not found then raise exception 'NOT_A_MEMBER'; end if;
  perform private.notify(p_player, 'member_removed', 'Removed from squad', 'The squad leader removed you from the squad', jsonb_build_object('group_id', gid));
end;
$$;

-- Hand leadership to another member (leader only)
create or replace function public.transfer_group_leadership(p_player uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_uid();
  gid uuid;
begin
  select g.id into gid from public.groups g where g.owner_id = uid for update;
  if gid is null then raise exception 'NOT_GROUP_LEADER'; end if;
  if not exists (select 1 from public.group_members m where m.group_id = gid and m.player_id = p_player and p_player <> uid) then
    raise exception 'NOT_A_MEMBER';
  end if;
  update public.groups set owner_id = p_player where id = gid;
  update public.group_members set role = case when player_id = p_player then 'leader' else 'member' end where group_id = gid;
  perform private.notify(p_player, 'leadership', 'You now lead the squad', 'Leadership was transferred to you', jsonb_build_object('group_id', gid));
end;
$$;

-- Open an asynchronous squad mission; every member flies it independently.
create or replace function public.create_group_mission(p_mission text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  gid  uuid;
  gm   uuid;
  mname text;
  me   text;
  rec  record;
begin
  select m.group_id into gid from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP'; end if;
  select ms.name into mname from public.missions ms where ms.id = p_mission;
  if mname is null then raise exception 'MISSION_NOT_FOUND'; end if;
  update public.group_missions set status = 'closed' where group_id = gid and status = 'open' and closes_at <= now();
  select id into gm from public.group_missions where group_id = gid and mission_id = p_mission and status = 'open';
  if gm is not null then return gm; end if;  -- idempotent: reuse the open session
  insert into public.group_missions (group_id, mission_id, created_by) values (gid, p_mission, uid) returning id into gm;
  select p.display_name into me from public.profiles p where p.id = uid;
  for rec in select m.player_id from public.group_members m where m.group_id = gid and m.player_id <> uid loop
    perform private.notify(rec.player_id, 'group_mission', 'Squad mission opened', me || ' opened ' || mname || ' for the squad',
      jsonb_build_object('group_mission_id', gm, 'mission_id', p_mission));
  end loop;
  return gm;
end;
$$;

-- Begin a mission attempt. Returns the run id that must be presented on completion.
create or replace function public.start_mission(p_mission text, p_group_mission uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_uid();
  gm  public.group_missions;
  run uuid;
begin
  if not exists (select 1 from public.missions where id = p_mission) then raise exception 'MISSION_NOT_FOUND'; end if;
  if p_group_mission is not null then
    select * into gm from public.group_missions where id = p_group_mission;
    if not found or gm.mission_id <> p_mission or not exists (
         select 1 from public.group_members m where m.group_id = gm.group_id and m.player_id = uid) then
      raise exception 'GROUP_MISSION_NOT_FOUND';
    end if;
    if gm.status <> 'open' or gm.closes_at <= now() then raise exception 'GROUP_MISSION_CLOSED'; end if;
    if exists (select 1 from public.mission_runs r where r.group_mission_id = gm.id and r.player_id = uid and r.state = 'completed') then
      raise exception 'ALREADY_FLOWN' using hint = 'You already completed this squad mission.';
    end if;
  end if;

  -- a player has at most one active run; older unfinished runs are abandoned (no reward)
  update public.mission_runs set state = 'abandoned' where player_id = uid and state = 'active';
  insert into public.mission_runs (player_id, mission_id, group_mission_id) values (uid, p_mission, p_group_mission)
  returning id into run;
  update public.player_statistics set missions_started = missions_started + 1, updated_at = now() where player_id = uid;
  perform private.grant_achievement(uid, 'first-launch');
  return run;
end;
$$;

-- Complete a run. All rewards are computed here from the mission catalog; client
-- numbers are only used after clamping to physically possible ranges.
--
-- Reward rules (documented in docs/multiplayer.md):
--   status    : SUCCESS requires science ≥ mission.min_science and risk < 70, otherwise downgraded to PARTIAL
--   score     : 0.45·science + 0.35·safety + 0.20·fuel efficiency (FAILURE capped at 45)
--   credits   : SUCCESS = reward, PARTIAL = 50 %, FAILURE = 0
--   xp        : base_xp × (1 / 0.5 / 0.2) + score
--   squad     : when ≥ 2 squad members succeed in the same squad mission, each successful
--               member earns a one-time +10 % credit bonus; squad totals accumulate all members' results
create or replace function public.complete_mission(
  p_run uuid, p_status text, p_science numeric, p_fuel_pct numeric, p_risk_pct numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := private.require_uid();
  r        public.mission_runs;
  ms       public.missions;
  gm       public.group_missions;
  v_status   text := upper(coalesce(p_status, ''));
  sci      integer;
  fuel     numeric := least(greatest(coalesce(p_fuel_pct, 0), 0), 100);
  risk     numeric := least(greatest(coalesce(p_risk_pct, 100), 0), 100);
  dur      integer;
  sci_s    integer;
  safe_s   integer;
  fuel_s   integer;
  v_score    integer;
  v_credits  integer;
  v_xp       integer;
  gid      uuid;
  bonus_total integer := 0;
  unlocked text[] := '{}';
  stats    public.player_statistics;
  rec      record;
  me       text;
begin
  select * into r from public.mission_runs where id = p_run for update;
  if not found or r.player_id <> uid then raise exception 'RUN_NOT_FOUND'; end if;
  if r.state <> 'active' then raise exception 'RUN_ALREADY_CLOSED' using hint = 'Rewards are granted once per run.'; end if;
  if v_status not in ('SUCCESS', 'PARTIAL', 'FAILURE') then raise exception 'INVALID_STATUS'; end if;
  select * into ms from public.missions where id = r.mission_id;

  dur := floor(extract(epoch from (now() - r.started_at)))::int;
  if dur < ms.min_duration_sec then
    raise exception 'RUN_TOO_SHORT' using hint = 'Mission reported complete faster than the simulation allows.';
  end if;

  sci := least(greatest(round(coalesce(p_science, 0))::int, 0), ms.science_cap);
  if v_status = 'SUCCESS' and (sci < ms.min_science or risk >= 70) then v_status := 'PARTIAL'; end if;

  sci_s  := least(100, round(least(1.2, sci::numeric / ms.min_science) * 85))::int;
  safe_s := greatest(10, least(100, round(100 - risk)))::int;
  fuel_s := least(100, round(fuel * 1.1))::int;
  v_score  := round(sci_s * 0.45 + safe_s * 0.35 + fuel_s * 0.20)::int;
  if v_status = 'FAILURE' then v_score := least(v_score, 45); end if;

  v_credits := case v_status when 'SUCCESS' then ms.reward_credits when 'PARTIAL' then ms.reward_credits / 2 else 0 end;
  v_xp := round(ms.base_xp * case v_status when 'SUCCESS' then 1.0 when 'PARTIAL' then 0.5 else 0.2 end)::int + v_score;

  if r.group_mission_id is not null then
    select * into gm from public.group_missions where id = r.group_mission_id;
    -- only count toward the squad if the player is still a member
    if exists (select 1 from public.group_members m where m.group_id = gm.group_id and m.player_id = uid) then
      gid := gm.group_id;
    end if;
  end if;

  update public.mission_runs set state = 'completed', completed_at = now() where id = r.id;
  insert into public.mission_results (run_id, player_id, mission_id, group_id, group_mission_id, status, science, score,
                                      credits_awarded, xp_awarded, duration_sec)
  values (r.id, uid, r.mission_id, gid, case when gid is null then null else r.group_mission_id end,
          v_status, sci, v_score, v_credits, v_xp, dur);

  update public.player_statistics
     set credits = credits + v_credits,
         xp = xp + v_xp,
         science_total = science_total + sci,
         missions_completed = missions_completed + case when v_status = 'FAILURE' then 0 else 1 end,
         missions_failed = missions_failed + case when v_status = 'FAILURE' then 1 else 0 end,
         group_missions_completed = group_missions_completed + case when gid is not null and v_status <> 'FAILURE' then 1 else 0 end,
         best_score = greatest(best_score, v_score),
         updated_at = now()
   where player_id = uid;

  if gid is not null then
    update public.groups
       set credits = credits + v_credits,
           xp_total = xp_total + v_xp,
           science_total = science_total + sci,
           missions_completed = missions_completed + case when v_status = 'FAILURE' then 0 else 1 end
     where id = gid;

    -- squad bonus: once two or more members succeed, every successful member gets +10 % once
    if (select count(*) from public.mission_results x where x.group_mission_id = r.group_mission_id and x.status = 'SUCCESS') >= 2 then
      for rec in
        select x.id, x.player_id from public.mission_results x
         where x.group_mission_id = r.group_mission_id and x.status = 'SUCCESS' and x.squad_bonus = 0
         for update
      loop
        update public.mission_results set squad_bonus = ms.reward_credits / 10 where id = rec.id;
        update public.player_statistics s set credits = s.credits + ms.reward_credits / 10, updated_at = now() where s.player_id = rec.player_id;
        update public.groups set credits = credits + ms.reward_credits / 10 where id = gid;
        perform private.notify(rec.player_id, 'squad_bonus', 'Squad bonus earned',
          '+' || (ms.reward_credits / 10) || ' credits for a coordinated ' || ms.name || ' success', jsonb_build_object('group_mission_id', r.group_mission_id));
        if rec.player_id = uid then bonus_total := ms.reward_credits / 10; end if;
      end loop;
    end if;

    select p.display_name into me from public.profiles p where p.id = uid;
    for rec in select m.player_id from public.group_members m where m.group_id = gid and m.player_id <> uid loop
      perform private.notify(rec.player_id, 'mission_result', 'Squad mission report',
        me || ' finished ' || ms.name || ' · ' || v_status || ' · score ' || v_score, jsonb_build_object('group_mission_id', r.group_mission_id));
    end loop;
  end if;

  -- achievements derived from server-side progress only
  select * into stats from public.player_statistics where player_id = uid;
  if v_status = 'SUCCESS' then
    if ms.id = 'mission-01' and private.grant_achievement(uid, 'lunar-explorer') then unlocked := array_append(unlocked, 'lunar-explorer'); end if;
    if ms.id = 'mission-02' and private.grant_achievement(uid, 'mars-pathfinder') then unlocked := array_append(unlocked, 'mars-pathfinder'); end if;
    if ms.id = 'mission-03' and private.grant_achievement(uid, 'deep-space-pioneer') then unlocked := array_append(unlocked, 'deep-space-pioneer'); end if;
    if ms.id = 'mission-04' and private.grant_achievement(uid, 'earth-sentinel') then unlocked := array_append(unlocked, 'earth-sentinel'); end if;
  end if;
  if v_score >= 90 and private.grant_achievement(uid, 'master-engineer') then unlocked := array_append(unlocked, 'master-engineer'); end if;
  if stats.science_total >= 500 and private.grant_achievement(uid, 'science-specialist') then unlocked := array_append(unlocked, 'science-specialist'); end if;
  if gid is not null and v_status <> 'FAILURE' and private.grant_achievement(uid, 'squad-operative') then unlocked := array_append(unlocked, 'squad-operative'); end if;

  return jsonb_build_object(
    'status', v_status, 'science', sci, 'score', v_score, 'credits', v_credits, 'xp', v_xp,
    'squad_bonus', bonus_total, 'achievements', to_jsonb(unlocked),
    'totals', jsonb_build_object('credits', stats.credits, 'xp', stats.xp, 'science', stats.science_total,
                                 'rank', public.rank_for_xp(stats.xp))
  );
end;
$$;

-- Player leaderboards. category: xp | science | missions | credits ; period: all | week | month
-- Weekly / monthly boards are rolling 7- and 30-day windows over mission_results.
create or replace function public.get_leaderboard(p_category text default 'xp', p_period text default 'all', p_limit integer default 50)
returns table (
  rank bigint, player_id uuid, player_code text, username text, display_name text, avatar text, player_rank text,
  value bigint, science bigint, missions bigint, xp bigint, credits bigint, is_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid   uuid := (select auth.uid());  -- null for visitors (read-only)
  since timestamptz := case lower(p_period) when 'week' then now() - interval '7 days'
                                            when 'month' then now() - interval '30 days' else null end;
  cat   text := lower(coalesce(p_category, 'xp'));
  lim   integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if cat not in ('xp', 'science', 'missions', 'credits') then raise exception 'INVALID_CATEGORY'; end if;
  return query
  with base as (
    select p.id, p.player_code, p.username, p.display_name, p.avatar, s.xp as total_xp,
           case when since is null then s.science_total::bigint else coalesce(w.sci, 0) end as sci,
           case when since is null then s.missions_completed::bigint else coalesce(w.done, 0) end as done,
           case when since is null then s.xp::bigint else coalesce(w.xp, 0) end as xpv,
           case when since is null then s.credits::bigint else coalesce(w.cr, 0) end as cr
    from public.profiles p
    join public.player_statistics s on s.player_id = p.id
    left join lateral (
      select sum(x.science) as sci, count(*) filter (where x.status <> 'FAILURE') as done,
             sum(x.xp_awarded) as xp, sum(x.credits_awarded + x.squad_bonus) as cr
      from public.mission_results x
      where since is not null and x.player_id = p.id and x.completed_at >= since
    ) w on true
    where p.show_stats or p.id = uid
  ), ranked as (
    select b.*,
           case cat when 'science' then b.sci when 'missions' then b.done when 'credits' then b.cr else b.xpv end as v
    from base b
  ), ordered as (
    select row_number() over (order by r.v desc, r.xpv desc, r.id) as rn, r.* from ranked r
    where since is null or r.v > 0 or r.id = uid
  )
  select o.rn, o.id, o.player_code, o.username, o.display_name, o.avatar, public.rank_for_xp(o.total_xp),
         o.v, o.sci, o.done, o.xpv, o.cr, coalesce(o.id = uid, false)
  from ordered o
  where o.rn <= lim or o.id = uid
  order by o.rn;
end;
$$;

create or replace function public.get_group_leaderboard(p_period text default 'all', p_limit integer default 25)
returns table (
  rank bigint, group_id uuid, group_code text, name text, emblem text, members bigint,
  xp bigint, science bigint, missions bigint, credits bigint, is_mine boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid   uuid := (select auth.uid());  -- null for visitors (read-only)
  mine  uuid := private.my_group_id();
  since timestamptz := case lower(p_period) when 'week' then now() - interval '7 days'
                                            when 'month' then now() - interval '30 days' else null end;
  lim   integer := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
  return query
  with base as (
    select g.id, g.group_code, g.name, g.emblem,
           (select count(*) from public.group_members m where m.group_id = g.id) as n,
           case when since is null then g.xp_total::bigint else coalesce(w.xp, 0) end as xpv,
           case when since is null then g.science_total::bigint else coalesce(w.sci, 0) end as sci,
           case when since is null then g.missions_completed::bigint else coalesce(w.done, 0) end as done,
           case when since is null then g.credits::bigint else coalesce(w.cr, 0) end as cr
    from public.groups g
    left join lateral (
      select sum(x.xp_awarded) as xp, sum(x.science) as sci,
             count(*) filter (where x.status <> 'FAILURE') as done, sum(x.credits_awarded + x.squad_bonus) as cr
      from public.mission_results x where since is not null and x.group_id = g.id and x.completed_at >= since
    ) w on true
  ), ordered as (
    select row_number() over (order by b.xpv desc, b.sci desc, b.id) as rn, b.* from base b
    where since is null or b.xpv > 0 or b.id = mine
  )
  select o.rn, o.id, o.group_code, o.name, o.emblem, o.n, o.xpv, o.sci, o.done, o.cr, coalesce(o.id = mine, false)
  from ordered o where o.rn <= lim or o.id = mine order by o.rn;
end;
$$;

-- Lock down the RPC surface: authenticated players only (username check is public for sign-up)
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_group(text, text, text, text)',
    'public.update_group(text, text, text, text)',
    'public.invite_to_group(uuid)',
    'public.respond_to_invitation(uuid, boolean)',
    'public.cancel_invitation(uuid)',
    'public.leave_group()',
    'public.remove_group_member(uuid)',
    'public.transfer_group_leadership(uuid)',
    'public.create_group_mission(text)',
    'public.start_mission(text, uuid)',
    'public.complete_mission(uuid, text, numeric, numeric, numeric)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
-- read-only browsing endpoints are open to visitors
revoke all on function public.search_players(text, integer), public.get_leaderboard(text, text, integer),
  public.get_group_leaderboard(text, integer) from public;
grant execute on function public.search_players(text, integer), public.get_leaderboard(text, text, integer),
  public.get_group_leaderboard(text, integer) to anon, authenticated;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.rank_for_xp(integer) to anon, authenticated;
