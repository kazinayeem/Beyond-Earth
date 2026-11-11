-- One-off upgrade for demo pilots created by the first version of demo_pilots.sql:
-- gives them random Bangladeshi names and usernames, removes the visible
-- "Demo pilot (seed data)" bio and the demo label on their squads.
-- Idempotent (tracked by raw_app_meta_data.named). Real players are never touched.

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

-- Bios from the first seed version
update public.profiles p set bio = null
  from auth.users u
 where u.id = p.id and u.raw_app_meta_data ->> 'demo' = 'true' and p.bio = 'Demo pilot (seed data)';

-- Squads created by earlier versions of this seed carried a visible demo label
update public.groups g
   set description = (array['Exploring the solar system together.','Lunar and Mars mission crew.','We fly, we learn, we land.','Science first, always.','Chasing asteroids since day one.','Mission planners from Bangladesh.'])[1 + floor(random() * 6)::int]
 where g.description = 'Demo squad (seed data).';
