-- Removes every demo pilot and demo squad created by demo_pilots.sql.
-- Real players are untouched: only rows tagged raw_app_meta_data.demo = true
-- and squads described as 'Demo squad (seed data).' are deleted.
delete from public.groups where description = 'Demo squad (seed data).';
delete from auth.users where raw_app_meta_data ->> 'demo' = 'true';  -- cascades to profiles, stats, results, achievements
