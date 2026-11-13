-- Squad totals include every mission a squad member flies.
--
-- Before: groups.science_total / xp_total / credits / missions_completed only grew from squad missions
-- (runs with a group_mission_id), so squads whose crew flew solo missions stayed at 0.
-- Now: a solo run completed while the player is in a squad is tagged with that squad (mission_results.group_id)
-- and adds to the squad totals. Squad-only rewards are unchanged: the +10 % coordination bonus,
-- group_missions_completed and the squad-operative achievement still need a real squad mission.
--
-- Safe to re-apply: the function is replaced, and the backfill only touches results not yet tagged.

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
  else
    -- solo flights by a squad member also count toward the squad's totals
    select m.group_id into gid from public.group_members m where m.player_id = uid;
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
         group_missions_completed = group_missions_completed + case when r.group_mission_id is not null and gid is not null and v_status <> 'FAILURE' then 1 else 0 end,
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
    if r.group_mission_id is not null
       and (select count(*) from public.mission_results x where x.group_mission_id = r.group_mission_id and x.status = 'SUCCESS') >= 2 then
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
        me || ' finished ' || ms.name || case when r.group_mission_id is null then ' (solo)' else '' end || ' · ' || v_status || ' · score ' || v_score,
        jsonb_build_object('group_mission_id', r.group_mission_id));
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
  if r.group_mission_id is not null and gid is not null and v_status <> 'FAILURE' and private.grant_achievement(uid, 'squad-operative') then unlocked := array_append(unlocked, 'squad-operative'); end if;

  return jsonb_build_object(
    'status', v_status, 'science', sci, 'score', v_score, 'credits', v_credits, 'xp', v_xp,
    'squad_bonus', bonus_total, 'achievements', to_jsonb(unlocked),
    'totals', jsonb_build_object('credits', stats.credits, 'xp', stats.xp, 'science', stats.science_total,
                                 'rank', public.rank_for_xp(stats.xp))
  );
end;
$$;

-- Backfill: solo results flown after the player joined their current squad
with tagged as (
  update public.mission_results x
     set group_id = m.group_id
    from public.group_members m
   where x.group_id is null
     and x.group_mission_id is null
     and m.player_id = x.player_id
     and x.completed_at >= m.joined_at
  returning x.group_id, x.science, x.xp_awarded, x.credits_awarded, x.squad_bonus, x.status
), sums as (
  select t.group_id,
         sum(t.science)::int as sci,
         sum(t.xp_awarded)::int as xp,
         sum(t.credits_awarded + t.squad_bonus)::int as cr,
         (count(*) filter (where t.status <> 'FAILURE'))::int as done
    from tagged t
   group by t.group_id
)
update public.groups g
   set science_total = g.science_total + s.sci,
       xp_total = g.xp_total + s.xp,
       credits = g.credits + s.cr,
       missions_completed = g.missions_completed + s.done,
       updated_at = now()
  from sums s
 where g.id = s.group_id;
