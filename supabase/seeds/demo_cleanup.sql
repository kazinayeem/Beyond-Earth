-- Removes every demo pilot and demo squad created by demo_pilots.sql.
-- Real players are untouched: only accounts tagged raw_app_meta_data.demo = true
-- (and squads they lead) are deleted.
delete from public.groups g
 using auth.users u
 where u.id = g.owner_id and u.raw_app_meta_data ->> 'demo' = 'true';
delete from auth.users where raw_app_meta_data ->> 'demo' = 'true';  -- cascades to profiles, stats, results, achievements
