-- =============================================================================
-- Demo data: 2,000 demo pilots with squads, mission history and achievements.
--
-- Runs with only database access (no service-role key):
--   • SQL Editor: paste this file and run it, or
--   • npm run db:seed-demo   (uses SUPABASE_DB_PASSWORD from .env.local)
--
-- Every demo account:
--   • is a real auth.users row, email demo-pilot-NNNN@example.com (a reserved
--     domain), tagged raw_app_meta_data.demo = true;
--   • has NO usable password (encrypted_password is empty), so nobody can sign in as it;
--   • gets its profile and MC-XXXXXX player ID from the normal signup trigger;
--   • gets a random Bangladeshi name and a matching unique username.
-- Demo pilots and squads are identified by that app_metadata flag (not by any
-- visible label), which is what demo_cleanup.sql uses.
-- Results use the same scoring and reward formula as public.complete_mission().
--
-- Safe to re-run: existing demo pilots are kept, and squads and history are only
-- generated once per pilot (tracked by raw_app_meta_data.demo_seeded). Remove everything with
-- supabase/seeds/demo_cleanup.sql.
-- =============================================================================

-- 1. Demo auth users (the on_auth_user_created trigger creates profile + statistics)
do $$
declare
  target  constant integer := 2000;
  i       integer;
  mail    text;
  created integer := 0;
begin
  for i in 1..target loop
    mail := format('demo-pilot-%s@example.com', lpad(i::text, 4, '0'));
    continue when exists (select 1 from auth.users u where u.email = mail);
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', mail, '', now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'demo', true),
      '{}'::jsonb,
      now() - random() * interval '120 days', now(),
      '', '', '', ''
    );
    created := created + 1;
  end loop;
  raise notice 'demo pilots created: %', created;
end;
$$;

-- 2. Bangladeshi names, unique usernames and avatars (once per pilot, tracked by app_metadata.named)
do $$
declare
  firsts text[] := array['tanvir','sakib','nusrat','farhana','tasnim','arif','rafiq','shakil','mahmud','sumaiya','jannat','mim','riya','fahim','imran','nafisa','tahmid','ayesha','sadia','rakib','shuvo','anika','mehedi','zubair','ishrat','raihan','sabbir','tamanna','nabila','hasan','rashed','sharmin','tasfia','ahnaf','labib','tahsin','muntasir','afsana','rifat','nayeem','shanto','mithila','rubel','sohel','jahid','lamia','sanjida','tonmoy','arnob','orpita','pritom','sourav','ananya','rupom','emon','faria','mahin','raisa','siam','tanha'];
  lasts  text[] := array['hossain','rahman','ahmed','islam','chowdhury','khan','uddin','alam','sarker','haque','miah','akter','talukder','bhuiyan','siddique','kabir','mahmud','karim','hasan','mridha','sheikh','biswas','das','roy','saha','mondal','molla','sultana','parvez','jaman'];
  rec    record;
  f      text;
  l      text;
  uname  text;
  tries  integer;
  named  integer := 0;
begin
  alter table public.profiles disable trigger profiles_protect;  -- usernames are normally immutable
  for rec in
    select p.id from public.profiles p join auth.users u on u.id = p.id
     where u.raw_app_meta_data ->> 'demo' = 'true' and coalesce(u.raw_app_meta_data ->> 'named', '') = ''
  loop
    f := firsts[1 + floor(random() * array_length(firsts, 1))::int];
    l := lasts[1 + floor(random() * array_length(lasts, 1))::int];
    tries := 0;
    loop
      tries := tries + 1;
      uname := left(f || '_' || l, 16) || (10 + floor(random() * (case when tries < 5 then 90 else 9990 end)))::int;
      exit when not exists (select 1 from public.profiles x where lower(x.username) = uname and x.id <> rec.id);
    end loop;
    update public.profiles
       set username = uname, display_name = initcap(f) || ' ' || initcap(l), bio = null,
           avatar = (array['orbit','nova','comet','ring','rocket','planet','star','moon'])[1 + floor(random() * 8)::int]
                    || '-' || (array['cyan','violet','amber','emerald','rose','sky'])[1 + floor(random() * 6)::int]
     where id = rec.id;
    update auth.users
       set raw_app_meta_data = raw_app_meta_data || '{"named": true}'::jsonb,
           raw_user_meta_data = jsonb_build_object('username', uname, 'display_name', initcap(f) || ' ' || initcap(l))
     where id = rec.id;
    named := named + 1;
  end loop;
  alter table public.profiles enable trigger profiles_protect;
  raise notice 'demo pilots named: %', named;
end;
$$;

-- 3. Squads of 2–3 for about 40% of demo pilots not yet processed (and not already in a squad)
do $$
declare
  a_names text[] := array['Apollo','Artemis','Orion','Vega','Lyra','Nova','Polaris','Helios','Kepler','Cassini','Voyager','Pioneer','Juno','Hubble','Titan','Europa','Ceres','Sirius','Rigel','Altair'];
  b_names text[] := array['Vanguard','Pathfinders','Navigators','Wardens','Survey Corps','Flight Crew','Rangers','Collective','Expedition','Relay','Lancers','Outpost'];
  specs   text[] := array['MOON','MARS','NEO','EO','DEEP'];
  rec     record;
  crew    uuid[] := '{}';
  size    integer := 3;
  gid     uuid;
  a       text;
  b       text;
  since   timestamptz;
  squads  integer := 0;
  k       integer;
begin
  for rec in
    select p.id
      from public.profiles p
      join auth.users u on u.id = p.id
     where u.raw_app_meta_data ->> 'demo' = 'true'
       and coalesce(u.raw_app_meta_data ->> 'demo_seeded', '') = ''
       and not exists (select 1 from public.group_members m where m.player_id = p.id)
       and random() < 0.4
     order by random()
  loop
    crew := crew || rec.id;
    if array_length(crew, 1) = size then
      a := a_names[1 + floor(random() * array_length(a_names, 1))::int];
      b := b_names[1 + floor(random() * array_length(b_names, 1))::int];
      since := now() - (30 + random() * 90) * interval '1 day';
      insert into public.groups (group_code, name, description, emblem, specialization, owner_id, created_at)
      values ('GRP-' || upper(left(a, 2) || left(b, 1)) || '-' || private.random_code(4), left(a || ' ' || b, 32),
              (array['Exploring the solar system together.','Lunar and Mars mission crew.','We fly, we learn, we land.','Science first, always.','Chasing asteroids since day one.','Mission planners from Bangladesh.'])[1 + floor(random() * 6)::int],
              (array['orbit','nova','comet','ring','rocket','planet','star','moon'])[1 + floor(random() * 8)::int]
                || '-' || (array['cyan','violet','amber','emerald','rose','sky'])[1 + floor(random() * 6)::int],
              case when random() < 0.85 then specs[1 + floor(random() * 5)::int] end, crew[1], since)
      returning id into gid;
      for k in 1..array_length(crew, 1) loop
        insert into public.group_members (group_id, player_id, role, joined_at)
        values (gid, crew[k], case when k = 1 then 'leader' else 'member' end, since);
      end loop;
      squads := squads + 1;
      crew := '{}';
      size := case when random() < 0.7 then 3 else 2 end;
    end if;
  end loop;
  raise notice 'demo squads created: %', squads;
end;
$$;

-- 4. Mission history over the last 90 days (same formula as complete_mission)
do $$
declare
  rec      record;
  ms       public.missions;
  n        integer;
  k        integer;
  skill    numeric;
  roll     numeric;
  v_status text;
  sci      integer;
  fuel     numeric;
  risk     numeric;
  sci_s    integer;
  safe_s   integer;
  fuel_s   integer;
  v_score  integer;
  v_cr     integer;
  v_xp     integer;
  dur      integer;
  done_at  timestamptz;
  run      uuid;
  gid      uuid;
  results  integer := 0;
begin
  for rec in
    select p.id, (select m.group_id from public.group_members m where m.player_id = p.id) as squad
      from public.profiles p
      join auth.users u on u.id = p.id
     where u.raw_app_meta_data ->> 'demo' = 'true'
       and coalesce(u.raw_app_meta_data ->> 'demo_seeded', '') = ''
  loop
    skill := power(random()::numeric, 0.7);
    n := (array[0,1,1,2,2,3,3,4,5,6,8,12])[1 + floor(random() * 12)::int];
    for k in 1..n loop
      select * into ms from public.missions order by random() limit 1;
      roll := random();
      v_status := case when roll < 0.15 + skill * 0.6 then 'SUCCESS' when roll < 0.85 then 'PARTIAL' else 'FAILURE' end;
      sci  := least(greatest(round(ms.min_science * (0.5 + random() * (0.6 + skill * 1.2)))::int, 0), ms.science_cap);
      fuel := 20 + random() * (40 + skill * 40);
      risk := 5 + random() * (70 - skill * 50);
      if v_status = 'SUCCESS' and (sci < ms.min_science or risk >= 70) then v_status := 'PARTIAL'; end if;
      sci_s  := least(100, round(least(1.2, sci::numeric / ms.min_science) * 85))::int;
      safe_s := greatest(10, least(100, round(100 - risk)))::int;
      fuel_s := least(100, round(fuel * 1.1))::int;
      v_score := round(sci_s * 0.45 + safe_s * 0.35 + fuel_s * 0.20)::int;
      if v_status = 'FAILURE' then v_score := least(v_score, 45); end if;
      v_cr := case v_status when 'SUCCESS' then ms.reward_credits when 'PARTIAL' then ms.reward_credits / 2 else 0 end;
      v_xp := round(ms.base_xp * case v_status when 'SUCCESS' then 1.0 when 'PARTIAL' then 0.5 else 0.2 end)::int + v_score;
      gid := case when rec.squad is not null and random() < 0.4 then rec.squad end;
      dur := 120 + floor(random() * 780)::int;
      done_at := now() - random() * interval '90 days';

      insert into public.mission_runs (player_id, mission_id, state, started_at, completed_at)
      values (rec.id, ms.id, 'completed', done_at - make_interval(secs => dur), done_at)
      returning id into run;
      insert into public.mission_results (run_id, player_id, mission_id, group_id, status, science, score,
                                          credits_awarded, xp_awarded, duration_sec, completed_at)
      values (run, rec.id, ms.id, gid, v_status, sci, v_score, v_cr, v_xp, dur, done_at);
      results := results + 1;
    end loop;
  end loop;
  -- mark as done so a re-run never adds a second history or squad
  update auth.users u set raw_app_meta_data = u.raw_app_meta_data || '{"demo_seeded": true}'::jsonb
   where u.raw_app_meta_data ->> 'demo' = 'true' and coalesce(u.raw_app_meta_data ->> 'demo_seeded', '') = '';
  raise notice 'demo mission results created: %', results;
end;
$$;

-- 5. Statistics, squad totals and achievements, derived from the results
update public.player_statistics s
   set credits = 1000 + a.cr, xp = a.xp, science_total = a.sci,
       missions_started = a.n, missions_completed = a.done, missions_failed = a.failed,
       group_missions_completed = a.squad, best_score = a.best
  from (
    select r.player_id,
           sum(r.credits_awarded + r.squad_bonus)::int as cr, sum(r.xp_awarded)::int as xp, sum(r.science)::int as sci,
           count(*)::int as n,
           count(*) filter (where r.status <> 'FAILURE')::int as done,
           count(*) filter (where r.status = 'FAILURE')::int as failed,
           count(*) filter (where r.group_id is not null and r.status <> 'FAILURE')::int as squad,
           max(r.score)::int as best
      from public.mission_results r
      join auth.users u on u.id = r.player_id and u.raw_app_meta_data ->> 'demo' = 'true'
     group by r.player_id
  ) a
 where s.player_id = a.player_id;

update public.groups g
   set credits = a.cr, xp_total = a.xp, science_total = a.sci, missions_completed = a.done
  from (
    select r.group_id, sum(r.credits_awarded + r.squad_bonus)::int as cr, sum(r.xp_awarded)::int as xp,
           sum(r.science)::int as sci, count(*) filter (where r.status <> 'FAILURE')::int as done
      from public.mission_results r
     where r.group_id is not null
     group by r.group_id
  ) a
 where g.id = a.group_id
   and exists (select 1 from auth.users u where u.id = g.owner_id and u.raw_app_meta_data ->> 'demo' = 'true');

-- Squads created by earlier versions of this seed carried a visible demo label
update public.groups g
   set description = (array['Exploring the solar system together.','Lunar and Mars mission crew.','We fly, we learn, we land.','Science first, always.','Chasing asteroids since day one.','Mission planners from Bangladesh.'])[1 + floor(random() * 6)::int]
 where g.description = 'Demo squad (seed data).';

insert into public.player_achievements (player_id, achievement_id, unlocked_at)
select x.player_id, x.achievement_id, min(x.at)
  from (
    select r.player_id, 'first-launch' as achievement_id, r.completed_at as at from public.mission_results r
    union all
    select r.player_id, case r.mission_id when 'mission-01' then 'lunar-explorer' when 'mission-02' then 'mars-pathfinder'
                                          when 'mission-03' then 'deep-space-pioneer' else 'earth-sentinel' end, r.completed_at
      from public.mission_results r where r.status = 'SUCCESS'
    union all
    select r.player_id, 'master-engineer', r.completed_at from public.mission_results r where r.score >= 90
    union all
    select r.player_id, 'squad-operative', r.completed_at from public.mission_results r where r.group_id is not null and r.status <> 'FAILURE'
    union all
    select s.player_id, 'science-specialist', now() from public.player_statistics s where s.science_total >= 500
  ) x
  join auth.users u on u.id = x.player_id and u.raw_app_meta_data ->> 'demo' = 'true'
 group by x.player_id, x.achievement_id
on conflict (player_id, achievement_id) do nothing;
