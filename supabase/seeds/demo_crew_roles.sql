-- Gives demo squad members a mix of crew roles (needs migrations 20261111120000_crew_roles and 20261113120000_squad_game).
-- Only squads led by demo pilots are touched; each squad gets distinct roles.
with ranked as (
  select m.group_id, m.player_id,
         row_number() over (partition by m.group_id order by random()) as n,
         floor(random() * 4)::int as shift
    from public.group_members m
    join public.groups g on g.id = m.group_id
    join auth.users u on u.id = g.owner_id and u.raw_app_meta_data ->> 'demo' = 'true'
)
update public.group_members gm
   set crew_role = (array['aerospace_engineer', 'science_officer', 'navigation_officer', 'communication_officer'])[1 + ((r.n - 1 + (select min(shift) from ranked x where x.group_id = r.group_id)) % 4)]
  from ranked r
 where gm.group_id = r.group_id and gm.player_id = r.player_id;

update public.group_members gm set crew_roles = array[gm.crew_role]
 where gm.group_id in (select g.id from public.groups g join auth.users u on u.id = g.owner_id and u.raw_app_meta_data ->> 'demo' = 'true');
