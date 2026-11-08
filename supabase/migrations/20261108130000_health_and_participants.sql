-- =============================================================================
-- Mission Control: Beyond Earth — health check and mission participants
--
-- Apply after 20261108120000_multiplayer_core.sql. Safe to run more than once.
-- =============================================================================

-- ── Health check ───────────────────────────────────────────────────────────
-- Lets the app tell "can't reach Supabase" apart from "schema not applied"
-- apart from "ready". Returns structure facts only, never player data.
create or replace function public.multiplayer_health()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schema_version', 2,
    'missing_tables', coalesce((
      select jsonb_agg(t order by t)
        from unnest(array[
          'missions', 'achievements', 'profiles', 'player_statistics', 'groups', 'group_members',
          'group_invitations', 'player_notifications', 'group_missions', 'mission_runs',
          'mission_results', 'player_achievements'
        ]) as t
       where to_regclass('public.' || t) is null
    ), '[]'::jsonb),
    'rls_disabled', coalesce((
      select jsonb_agg(c.relname::text order by c.relname)
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    ), '[]'::jsonb),
    'signup_trigger', exists (
      select 1 from pg_catalog.pg_trigger
       where tgname = 'on_auth_user_created' and not tgisinternal
    ),
    'missions', (select count(*) from public.missions),
    'achievements', (select count(*) from public.achievements)
  );
$$;

revoke all on function public.multiplayer_health() from public;
grant execute on function public.multiplayer_health() to anon, authenticated;

-- ── Mission participants ───────────────────────────────────────────────────
-- Who is flying which mission. A view over mission_runs with the caller's
-- permissions (security_invoker), so the mission_runs policies still apply.
create or replace view public.mission_participants
with (security_invoker = true) as
select r.id          as run_id,
       r.player_id,
       r.mission_id,
       r.group_mission_id,
       gm.group_id,
       r.state,
       r.started_at,
       r.completed_at
  from public.mission_runs r
  left join public.group_missions gm on gm.id = r.group_mission_id;

revoke all on public.mission_participants from public, anon, authenticated;
grant select on public.mission_participants to authenticated;

-- Squad members can see each other's runs on their shared squad missions
-- (so a squad can tell who has already flown). Solo runs stay private.
drop policy if exists "squad runs on shared missions" on public.mission_runs;
create policy "squad runs on shared missions" on public.mission_runs for select to authenticated
  using (
    group_mission_id is not null
    and exists (
      select 1 from public.group_missions gm
       where gm.id = mission_runs.group_mission_id
         and gm.group_id = (select private.my_group_id())
    )
  );

-- ── Timestamps ─────────────────────────────────────────────────────────────
-- Keep player_statistics.updated_at current on every change, not only in the
-- RPCs that set it explicitly.
drop trigger if exists player_statistics_touch on public.player_statistics;
create trigger player_statistics_touch before update on public.player_statistics
  for each row execute function private.touch_updated_at();
