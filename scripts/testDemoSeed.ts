/** Applies the migrations + demo seed (scaled down) to PGlite and checks the result. Run: npx tsx scripts/testDemoSeed.ts */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
let failed = 0;
const ok = (c: unknown, n: string) => { console.log(`  ${c ? '✓' : '✗'} ${n}`); if (!c) failed++; };

async function main() {
  const db = new PGlite();
  await db.exec(readFileSync(join(root, 'supabase/tests/supabase-prelude.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'supabase/migrations', f), 'utf8'));
  await db.query(`insert into auth.users (email, raw_user_meta_data) values ('real@player.dev', '{"username":"real_one"}')`);
  const seed = readFileSync(join(root, 'supabase/seeds/demo_pilots.sql'), 'utf8').replace('target  constant integer := 2000', 'target  constant integer := 300');
  const t = Date.now();
  await db.exec(seed);
  console.log(`seeded in ${Date.now() - t} ms`);
  const one = async <T,>(sql: string) => (await db.query<T>(sql)).rows[0];
  const c = await one<{ users: number; profiles: number; codes: number }>(`select (select count(*) from auth.users where raw_app_meta_data->>'demo'='true')::int users,
    (select count(*) from public.profiles p join auth.users u on u.id=p.id where u.raw_app_meta_data->>'demo'='true')::int profiles,
    (select count(distinct player_code) from public.profiles)::int codes`);
  ok(c.users === 300 && c.profiles === 300, `300 demo users with profiles (${c.users}/${c.profiles})`);
  ok(c.codes === 301, 'every player ID unique');
  const nm = await one<{ bad: number; dup: number; labels: number }>(`select
    count(*) filter (where p.username !~ '^[a-z]+_[a-z]+[0-9]{2,4}$' or p.display_name !~ '^[A-Z][a-z]+ [A-Z][a-z]+$')::int bad,
    (select count(*) - count(distinct lower(username)) from public.profiles)::int dup,
    count(*) filter (where p.bio ilike '%demo%' or p.bio ilike '%seed%')::int labels
    from public.profiles p join auth.users u on u.id=p.id where u.raw_app_meta_data->>'demo'='true'`);
  ok(nm.bad === 0 && nm.dup === 0, 'demo pilots have Bangladeshi-style names and unique usernames');
  ok(nm.labels === 0 && (await one<{ n: number }>(`select count(*)::int n from public.groups where description ilike '%demo%'`)).n === 0, 'no visible demo labels on profiles or squads');
  const realOk = await one<{ username: string }>(`select username from public.profiles p join auth.users u on u.id=p.id where u.email='real@player.dev'`);
  ok(realOk.username === 'real_one', 'real player untouched');
  const g = await one<{ n: number; too_big: number; too_small: number }>(`select count(*)::int n,
    count(*) filter (where (select count(*) from public.group_members m where m.group_id=g.id) > 3)::int too_big,
    count(*) filter (where (select count(*) from public.group_members m where m.group_id=g.id) < 2)::int too_small from public.groups g`);
  ok(g.n > 20 && g.too_big === 0 && g.too_small === 0, `${g.n} squads, all with 2–3 members`);
  const r = await one<{ n: number; bad: number }>(`select count(*)::int n, count(*) filter (where
      (status='SUCCESS' and credits_awarded <> m.reward_credits) or (status='PARTIAL' and credits_awarded <> m.reward_credits/2) or (status='FAILURE' and (credits_awarded<>0 or score>45))
      or (status='SUCCESS' and science < m.min_science) or science > m.science_cap)::int bad
    from public.mission_results r join public.missions m on m.id=r.mission_id`);
  ok(r.n > 300 && r.bad === 0, `${r.n} results, all consistent with the reward rules`);
  const s = await one<{ bad: number }>(`select count(*)::int bad from public.player_statistics s
    join auth.users u on u.id=s.player_id and u.raw_app_meta_data->>'demo'='true'
    where s.credits <> 1000 + coalesce((select sum(credits_awarded) from public.mission_results r where r.player_id=s.player_id),0)
       or s.xp <> coalesce((select sum(xp_awarded) from public.mission_results r where r.player_id=s.player_id),0)`);
  ok(s.bad === 0, 'statistics match the results');
  const gs = await one<{ bad: number }>(`select count(*)::int bad from public.groups g where g.xp_total <> coalesce((select sum(xp_awarded) from public.mission_results r where r.group_id=g.id),0)`);
  ok(gs.bad === 0, 'squad totals match squad results');
  ok((await one<{ n: number }>(`select count(*)::int n from public.player_achievements`)).n > 100, 'achievements unlocked');
  const lb = (await db.query(`select * from public.get_leaderboard('xp','week',10)`)).rows.length;
  ok(lb === 10, 'weekly leaderboard populated');
  await db.exec(readFileSync(join(root, 'supabase/seeds/demo_crew_roles.sql'), 'utf8'));
  const cr = await one<{ dup: number; kinds: number }>(`select
    (select count(*) from (select group_id from public.group_members group by group_id having count(distinct crew_role) <> count(*)) d)::int dup,
    (select count(distinct crew_role) from public.group_members)::int kinds`);
  ok(cr.dup === 0 && cr.kinds === 4, 'demo squads get distinct, mixed crew roles');
  const before = await one<{ r: number; g: number }>(`select (select count(*) from public.mission_results)::int r, (select count(*) from public.groups)::int g`);
  await db.exec(seed);
  const after = await one<{ u: number; r: number; g: number }>(`select (select count(*) from auth.users)::int u, (select count(*) from public.mission_results)::int r, (select count(*) from public.groups)::int g`);
  ok(after.u === 301 && after.r === before.r && after.g === before.g, 're-running adds no duplicate users, results or squads');
  await db.exec(readFileSync(join(root, 'supabase/seeds/demo_cleanup.sql'), 'utf8'));
  const left = await one<{ u: number; p: number; g: number; r: number }>(`select (select count(*) from auth.users)::int u, (select count(*) from public.profiles)::int p, (select count(*) from public.groups)::int g, (select count(*) from public.mission_results)::int r`);
  ok(left.u === 1 && left.p === 1 && left.g === 0 && left.r === 0, 'cleanup removes all demo data and keeps the real player');
  if (failed) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
