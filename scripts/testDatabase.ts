/**
 * Database test suite: applies supabase/migrations to an in-process Postgres
 * (PGlite) with a minimal Supabase auth shim, then exercises RLS, the RPC API,
 * squad rules and anti-forgery checks as different users.
 *
 * Run: npm run test:db
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
let passed = 0;
let failed = 0;
const ok = (cond: unknown, name: string) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};

async function main() {
  const db = new PGlite();
  await db.exec(readFileSync(join(root, 'supabase/tests/supabase-prelude.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(root, 'supabase/migrations', f), 'utf8'));
  }
  console.log('Migrations applied.\n');

  // ── helpers ──
  const asAdmin = async () => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); };
  const as = async (uid: string | null) => {
    await db.exec(`reset role;`);
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
    await db.exec(uid ? `set role authenticated;` : `set role anon;`);
  };
  const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
  const fails = async (sql: string, params: unknown[] = [], match?: RegExp) => {
    try { await db.query(sql, params); return false; }
    catch (e) { return match ? match.test(String((e as Error).message)) : true; }
  };
  const signUp = async (email: string, meta: Record<string, string>) => {
    await asAdmin();
    const r = await q<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, meta]);
    return r[0].id;
  };
  const backdate = async (run: string, seconds: number) => {
    await asAdmin();
    await db.query(`update public.mission_runs set started_at = now() - make_interval(secs => $2) where id = $1`, [run, seconds]);
  };

  // ── Identity ──
  console.log('[identity]');
  const ana = await signUp('ana@example.com', { username: 'ana_orbit', display_name: 'Ana Orbit' });
  const ben = await signUp('ben@example.com', { username: 'ben', display_name: 'Ben Kerman' });
  const cy = await signUp('cy@example.com', { username: 'cy_x', display_name: 'Cy' });
  const dee = await signUp('dee@example.com', { username: 'dee_dee', display_name: 'Dee' });
  const dup = await signUp('dup@example.com', { username: 'ANA_ORBIT', display_name: 'Dup' });
  const p = await q<{ id: string; player_code: string; username: string }>(`select id, player_code, username from public.profiles order by created_at`);
  ok(p.length === 5, 'profile auto-created for every new auth user');
  ok(p.every(x => /^MC-[2-9A-HJ-NP-Z]{6}$/.test(x.player_code)), 'every player gets an MC-XXXXXX player ID');
  ok(new Set(p.map(x => x.player_code)).size === 5, 'player IDs are unique');
  ok(p.find(x => x.id === dup)!.username.startsWith('pilot_'), 'duplicate username (case-insensitive) falls back to a generated one');
  ok((await q(`select 1 from public.player_statistics`)).length === 5, 'statistics row created with each profile');
  ok(await fails(`insert into public.profiles (id, player_code, username, display_name) values (gen_random_uuid(), 'MC-AAAAAA', 'x_y', 'Xy')`), 'profiles require a real auth user (FK)');

  await as(null);
  ok((await q<{ a: boolean }>(`select public.username_available('ana_orbit') as a`))[0].a === false, 'anon: taken username reported unavailable');
  ok((await q<{ a: boolean }>(`select public.username_available('fresh_name') as a`))[0].a === true, 'anon: free username reported available');
  ok((await q(`select player_code, username from public.profiles`)).length === 5, 'visitors can browse public player cards');
  ok((await q(`select * from public.search_players('ana')`)).length >= 1, 'visitors can search players');
  ok((await q(`select * from public.get_leaderboard('xp', 'all', 10)`)).length >= 1, 'visitors can view the leaderboard');
  ok(await fails(`select public.start_mission('mission-01')`, [], /permission denied/), 'visitors cannot start missions');
  ok(await fails(`select public.create_group('Anon squad', null, 'orbit-cyan', null)`, [], /permission denied/), 'visitors cannot create squads');
  ok(await fails(`select * from public.player_notifications`, [], /permission denied/), 'visitors cannot read notifications');
  ok(await fails(`select * from public.group_invitations`, [], /permission denied/), 'visitors cannot read invitations');

  // ── Profile editing & forgery ──
  console.log('[profile security]');
  await as(ana);
  await q(`update public.profiles set display_name = 'Ana O.', avatar = 'nova-violet' where id = $1`, [ana]);
  ok((await q<{ display_name: string }>(`select display_name from public.profiles where id = $1`, [ana]))[0].display_name === 'Ana O.', 'player can edit own display name and avatar');
  ok(await fails(`update public.profiles set player_code = 'MC-ZZZZZZ' where id = $1`, [ana], /permission denied/), 'player ID cannot be changed');
  ok(await fails(`update public.profiles set username = 'admin' where id = $1`, [ana], /permission denied/), 'username cannot be changed');
  const bensBefore = (await q<{ display_name: string }>(`select display_name from public.profiles where id = $1`, [ben]))[0].display_name;
  await q(`update public.profiles set display_name = 'hacked' where id = $1`, [ben]);
  ok((await q<{ display_name: string }>(`select display_name from public.profiles where id = $1`, [ben]))[0].display_name === bensBefore, "cannot edit another player's profile (RLS)");
  ok(await fails(`update public.player_statistics set credits = 999999 where player_id = $1`, [ana], /permission denied/), 'cannot forge own credits');
  ok(await fails(`insert into public.mission_results (run_id, player_id, mission_id, status, science, score, credits_awarded, xp_awarded, duration_sec) values (gen_random_uuid(), $1, 'mission-01', 'SUCCESS', 999, 100, 99999, 99999, 1)`, [ana], /permission denied/), 'cannot insert forged mission results');
  ok(await fails(`insert into public.player_achievements (player_id, achievement_id) values ($1, 'master-engineer')`, [ana], /permission denied/), 'cannot self-award achievements');
  ok(!JSON.stringify(await q(`select * from public.profiles`)).includes('@example.com'), 'no email addresses are exposed through profiles');

  // ── Search ──
  console.log('[search]');
  const code = p.find(x => x.id === ben)!.player_code;
  const byCode = await q<{ id: string }>(`select * from public.search_players($1)`, [code.toLowerCase()]);
  ok(byCode.length === 1 && byCode[0].id === ben, 'search by player ID (case-insensitive) finds exact player');
  ok((await q(`select * from public.search_players('kerman')`)).length === 1, 'search matches display-name words');
  ok((await q(`select * from public.search_players('%')`)).length === 0, 'LIKE wildcards are escaped');
  ok(!Object.keys((await q(`select * from public.search_players('ben')`))[0] ?? {}).includes('email'), 'search results never include email');

  // ── Squads ──
  console.log('[squads]');
  await as(ana);
  const grp = (await q<{ id: string; group_code: string }>(`select * from public.create_group('Red Horizon', 'Mars specialists', 'nova-violet', 'mars')`))[0];
  ok(/^GRP-MARS-[2-9A-HJ-NP-Z]{4}$/.test(grp.group_code), `squad created with ID ${grp.group_code}`);
  ok((await q<{ role: string }>(`select role from public.group_members where player_id = $1`, [ana]))[0].role === 'leader', 'creator becomes leader');
  ok(await fails(`select public.create_group('Second', null, 'orbit-cyan', null)`, [], /ALREADY_IN_GROUP/), 'cannot create a second squad while in one');
  ok(await fails(`insert into public.group_members (group_id, player_id) values ($1, $2)`, [grp.id, dee], /permission denied/), 'cannot insert squad members directly');
  ok(await fails(`select public.invite_to_group($1)`, [ana], /CANNOT_INVITE_SELF/), 'self-invitation rejected');
  const invBen = (await q<{ invite_to_group: string }>(`select public.invite_to_group($1)`, [ben]))[0].invite_to_group;
  ok(!!invBen, 'leader invites Ben');
  ok(await fails(`select public.invite_to_group($1)`, [ben], /INVITE_ALREADY_PENDING/), 'duplicate pending invitation rejected');
  await as(ben);
  ok((await q(`select * from public.player_notifications where kind = 'invite'`)).length === 1, 'invitee receives an in-app notification');
  ok((await q(`select * from public.group_members where player_id = $1`, [ben])).length === 0, 'invited player is NOT added before accepting');
  await as(cy);
  ok((await q(`select * from public.player_notifications`)).length === 0, "players cannot read others' notifications");
  ok(await fails(`select public.respond_to_invitation($1, true)`, [invBen], /INVITATION_NOT_FOUND/), "cannot accept someone else's invitation");
  await as(ben);
  ok((await q<{ r: string }>(`select public.respond_to_invitation($1, true) as r`, [invBen]))[0].r === 'accepted', 'Ben accepts');
  ok((await q(`select * from public.group_members where group_id = $1`, [grp.id])).length === 2, 'squad has 2 members');
  // Ben (member) can invite too
  const invCy = (await q<{ i: string }>(`select public.invite_to_group($1) as i`, [cy]))[0].i;
  await as(dee);
  const deeGroup = (await q<{ id: string }>(`select * from public.create_group('Lone Wolf', null, 'orbit-cyan', null)`))[0];
  await asAdmin();
  await as(ana);
  const invDee = (await q<{ i: string }>(`select public.invite_to_group($1) as i`, [dee]))[0].i;
  await as(cy);
  await q(`select public.respond_to_invitation($1, true)`, [invCy]);
  ok((await q(`select * from public.group_members where group_id = $1`, [grp.id])).length === 3, 'third member joins (3/3)');
  await as(ana);
  ok(await fails(`select public.invite_to_group($1)`, [dup], /GROUP_FULL/), 'cannot invite into a full squad');
  await as(dee);
  await q(`select public.leave_group()`); // dissolve Dee's solo squad so only capacity blocks her
  ok((await q(`select * from public.groups where id = $1`, [deeGroup.id])).length === 0, 'last member leaving dissolves the squad');
  ok(await fails(`select public.respond_to_invitation($1, true)`, [invDee], /GROUP_FULL/), 'fourth member is rejected at acceptance');
  await asAdmin();
  ok((await q<{ n: number }>(`select count(*)::int as n from public.group_members where group_id = $1`, [grp.id]))[0].n === 3, 'capacity still 3 after rejected join');
  ok(await fails(`insert into public.group_members (group_id, player_id) values ($1, $2)`, [grp.id, dee], /GROUP_FULL/), 'trigger blocks a 4th member even for privileged inserts');

  await as(ben);
  ok(await fails(`select public.remove_group_member($1)`, [cy], /NOT_GROUP_LEADER/), 'non-leader cannot remove members');
  ok(await fails(`select public.transfer_group_leadership($1)`, [ben], /NOT_GROUP_LEADER/), 'non-leader cannot transfer leadership');
  await as(ana);
  await q(`select public.remove_group_member($1)`, [cy]);
  ok((await q(`select * from public.group_members where player_id = $1`, [cy])).length === 0, 'leader removes a member');
  await q(`select public.transfer_group_leadership($1)`, [ben]);
  await asAdmin();
  ok((await q<{ owner_id: string }>(`select owner_id from public.groups where id = $1`, [grp.id]))[0].owner_id === ben, 'leadership transferred');
  await as(ben);
  await q(`select public.leave_group()`);
  await asAdmin();
  ok((await q<{ owner_id: string }>(`select owner_id from public.groups where id = $1`, [grp.id]))[0].owner_id === ana, 'leader leaving hands leadership to remaining member');
  await as(cy);
  ok((await q(`select * from public.group_invitations where group_id = $1 and invitee_id <> $2`, [grp.id, cy])).length === 0, "ex-members only see invitations addressed to themselves");
  ok((await q(`select * from public.group_missions`)).length === 0, 'non-members cannot read squad missions');

  // expired invitation
  await as(ana);
  const invExp = (await q<{ i: string }>(`select public.invite_to_group($1) as i`, [dup]))[0].i;
  await asAdmin();
  await q(`update public.group_invitations set expires_at = now() - interval '1 minute' where id = $1`, [invExp]);
  await as(dup);
  ok((await q<{ r: string }>(`select public.respond_to_invitation($1, true) as r`, [invExp]))[0].r === 'expired', 'expired invitation cannot be accepted');
  await as(ana);
  const invDecl = (await q<{ i: string }>(`select public.invite_to_group($1) as i`, [dup]))[0].i;
  await as(dup);
  ok((await q<{ r: string }>(`select public.respond_to_invitation($1, false) as r`, [invDecl]))[0].r === 'declined', 'invitation can be declined');
  ok((await q(`select * from public.group_members where player_id = $1`, [dup])).length === 0, 'declining does not join');

  // ── Missions & rewards ──
  console.log('[missions & anti-forgery]');
  await as(ana);
  const run1 = (await q<{ r: string }>(`select public.start_mission('mission-01') as r`))[0].r;
  ok(await fails(`select public.complete_mission($1, 'SUCCESS', 200, 50, 10)`, [run1], /RUN_TOO_SHORT/), 'instant completion rejected (minimum flight time)');
  await backdate(run1, 120);
  await as(ben);
  ok(await fails(`select public.complete_mission($1, 'SUCCESS', 200, 50, 10)`, [run1], /RUN_NOT_FOUND/), "cannot complete another player's run");
  await as(ana);
  const r1 = (await q<{ r: { status: string; science: number; credits: number; score: number } }>(`select public.complete_mission($1, 'SUCCESS', 99999, 80, 12) as r`, [run1]))[0].r;
  ok(r1.science === 400, `forged science clamped to mission cap (${r1.science})`);
  ok(r1.credits === 1000, 'credits come from the mission catalog, not the client');
  ok(r1.score >= 0 && r1.score <= 100, `score computed server-side (${r1.score})`);
  ok(await fails(`select public.complete_mission($1, 'SUCCESS', 100, 50, 10)`, [run1], /RUN_ALREADY_CLOSED/), 'duplicate reward for the same run rejected');
  const stats1 = (await q<{ credits: number; missions_completed: number }>(`select * from public.player_statistics where player_id = $1`, [ana]))[0];
  ok(stats1.credits === 2000 && stats1.missions_completed === 1, 'statistics updated once (1000 start + 1000 reward)');
  const run2 = (await q<{ r: string }>(`select public.start_mission('mission-02') as r`))[0].r;
  await backdate(run2, 120);
  await as(ana);
  const r2 = (await q<{ r: { status: string; credits: number } }>(`select public.complete_mission($1, 'SUCCESS', 20, 50, 10) as r`, [run2]))[0].r;
  ok(r2.status === 'PARTIAL' && r2.credits === 1250, 'claimed SUCCESS below science target is downgraded to PARTIAL');
  ok((await q(`select * from public.player_achievements where player_id = $1`, [ana])).length >= 2, 'achievements granted from server-side progress');

  // squad mission + bonus
  await as(ana);
  const invBen2 = (await q<{ i: string }>(`select public.invite_to_group($1) as i`, [ben]))[0].i;
  await as(ben);
  await q(`select public.respond_to_invitation($1, true)`, [invBen2]);
  await as(ana);
  const gm = (await q<{ g: string }>(`select public.create_group_mission('mission-03') as g`))[0].g;
  ok((await q<{ g: string }>(`select public.create_group_mission('mission-03') as g`))[0].g === gm, 'opening the same squad mission twice reuses the session');
  await as(cy);
  ok(await fails(`select public.start_mission('mission-03', $1)`, [gm], /GROUP_MISSION_NOT_FOUND/), 'non-members cannot join a squad mission');
  await as(ana);
  const ra = (await q<{ r: string }>(`select public.start_mission('mission-03', $1) as r`, [gm]))[0].r;
  await as(ben);
  const rb = (await q<{ r: string }>(`select public.start_mission('mission-03', $1) as r`, [gm]))[0].r;
  await backdate(ra, 300); await backdate(rb, 300);
  await as(ana);
  const ga = (await q<{ r: { squad_bonus: number } }>(`select public.complete_mission($1, 'SUCCESS', 300, 70, 20) as r`, [ra]))[0].r;
  ok(ga.squad_bonus === 0, 'no squad bonus with a single success');
  await as(ben);
  const gb = (await q<{ r: { squad_bonus: number } }>(`select public.complete_mission($1, 'SUCCESS', 300, 70, 20) as r`, [rb]))[0].r;
  ok(gb.squad_bonus === 400, 'second squad success triggers +10 % bonus');
  await asAdmin();
  const bonuses = await q<{ squad_bonus: number }>(`select squad_bonus from public.mission_results where group_mission_id = $1`, [gm]);
  ok(bonuses.length === 2 && bonuses.every(b => b.squad_bonus === 400), 'bonus applied exactly once to each successful member');
  const g = (await q<{ missions_completed: number; credits: number }>(`select * from public.groups where id = $1`, [grp.id]))[0];
  ok(g.missions_completed === 2 && g.credits === 8800, `squad totals accumulate (${g.missions_completed} missions, ${g.credits} credits)`);
  await as(ben);
  ok(await fails(`select public.start_mission('mission-03', $1)`, [gm], /ALREADY_FLOWN/), 'cannot fly the same squad mission twice');
  ok((await q(`select * from public.mission_results where player_id = $1`, [ana])).length >= 1, 'squad mates can see each other\'s squad results');

  // ── Leaderboards & privacy ──
  console.log('[leaderboards & privacy]');
  await as(cy);
  const lb = await q<{ rank: number; player_id: string; is_me: boolean; value: number }>(`select * from public.get_leaderboard('credits', 'all', 3)`);
  ok(lb[0].player_id === ana || lb[0].player_id === ben, 'leaderboard ranks top earner first');
  ok(lb.some(r => r.is_me), "caller's own row is always included and flagged");
  ok((await q(`select * from public.get_leaderboard('xp', 'week', 10)`)).length >= 2, 'weekly board aggregates recent results');
  ok((await q(`select * from public.get_group_leaderboard('all', 10)`)).length >= 1, 'squad leaderboard returns squads');
  ok(await fails(`select * from public.get_leaderboard('drop table', 'all', 10)`, [], /INVALID_CATEGORY/), 'invalid leaderboard category rejected');
  await as(ana);
  await q(`update public.profiles set show_stats = false, show_history = false where id = $1`, [ana]);
  await as(cy);
  ok((await q(`select * from public.player_statistics where player_id = $1`, [ana])).length === 0, 'private stats hidden from other players');
  ok((await q(`select * from public.mission_results where player_id = $1`, [ana])).length === 0, 'private mission history hidden from non-squad players');
  ok(!(await q<{ player_id: string }>(`select * from public.get_leaderboard('credits', 'all', 50)`)).some(r => r.player_id === ana), 'private players excluded from public leaderboards');
  await as(ana);
  ok((await q(`select * from public.player_statistics where player_id = $1`, [ana])).length === 1, 'private player still sees own stats');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
