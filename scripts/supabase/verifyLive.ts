/**
 * Live integration checks against the real Supabase project, run after
 * `npm run seed:players`:
 *
 *   npm run verify:supabase            (set APP_URL=http://localhost:3000 to also check the app)
 *
 * Signs in as the seeded players and exercises auth, profiles, RLS, squads and
 * leaderboards. The squad-capacity test temporarily changes membership and
 * always restores "Orbital Pioneers" to leader + Nova + Kai afterwards.
 * No passwords or keys are printed.
 */
import {
  PILOTS, SQUAD_NAME, adminClient, env, findUsersByEmail, loadCredentials, passwordFor, publicClient, requireSchema, signIn,
} from './shared';

let passed = 0;
let failed = 0;
const ok = (cond: unknown, name: string, detail = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}${detail ? `  (${detail})` : ''}`); }
  else { failed++; console.error(`  ✗ ${name}${detail ? `  (${detail})` : ''}`); }
};
type Session = Awaited<ReturnType<typeof signIn>>;

async function main() {
  const store = loadCredentials();
  const pub = publicClient();

  console.log('[schema]');
  const h = await requireSchema(pub);
  ok(h.missing_tables.length === 0 && h.rls_disabled.length === 0, 'all multiplayer tables present, RLS on every table');
  ok(h.signup_trigger && h.missions === 4, 'signup trigger and mission catalog in place');

  console.log('[accounts]');
  if (env('SUPABASE_SERVICE_ROLE_KEY', false)) {
    const users = await findUsersByEmail(adminClient());
    const seeded = PILOTS.filter(p => users.has(p.email.toLowerCase()));
    ok(seeded.length === 5, 'five seeded auth users exist', `${seeded.length}/5`);
    ok(seeded.every(p => users.get(p.email.toLowerCase())?.email_confirmed_at), 'all five emails confirmed');
  } else {
    console.log('  – auth user count skipped (no SUPABASE_SERVICE_ROLE_KEY); sign-ins below still prove the accounts exist');
  }

  const s: Record<string, Session> = {};
  for (const p of PILOTS) {
    const pw = passwordFor(p, store);
    if (!pw) { ok(false, `${p.displayName} can sign in`, 'no stored password; run seed:players'); continue; }
    try { s[p.key] = await signIn(p.email, pw); ok(true, `${p.displayName} can sign in`); }
    catch (e) { ok(false, `${p.displayName} can sign in`, (e as Error).message); }
  }
  if (Object.keys(s).length < 5) throw new Error('Not every seeded player could sign in; stopping.');
  const { primary: A, nova: B, kai: C, lena: D, arjun: E } = s;

  console.log('[profiles]');
  const { data: profiles } = await pub.from('profiles').select('id, player_code, username').in('id', Object.values(s).map(x => x.uid));
  ok(profiles?.length === 5, 'five player profiles exist', `${profiles?.length ?? 0}/5`);
  ok(profiles?.every(p => /^MC-[2-9A-HJ-NP-Z]{6}$/.test(p.player_code)), 'every player has an MC-XXXXXX player ID');
  ok(new Set(profiles?.map(p => p.player_code)).size === 5, 'player IDs are unique');
  const { data: own } = await A.client.from('profiles').select('*').eq('id', A.uid).single();
  ok(own?.id === A.uid, 'primary account can load its own profile', own?.player_code);
  ok(own && !('email' in own), 'profile rows contain no email address');
  const { data: stats } = await A.client.from('player_statistics').select('*').eq('player_id', A.uid).single();
  ok(stats && typeof stats.credits === 'number' && typeof stats.missions_completed === 'number', 'mission statistics load', stats ? `${stats.credits} credits, ${stats.missions_completed} missions` : 'none');

  console.log('[RLS]');
  const before = own?.display_name;
  await B.client.from('profiles').update({ display_name: 'Hijacked' }).eq('id', A.uid);
  const { data: after } = await A.client.from('profiles').select('display_name').eq('id', A.uid).single();
  ok(after?.display_name === before, "players can't edit someone else's profile");
  const { error: credErr } = await B.client.from('player_statistics').update({ credits: 999999 }).eq('player_id', B.uid);
  ok(credErr, "players can't write their own credits");
  const { error: codeErr } = await B.client.from('profiles').update({ player_code: 'MC-HACKED' }).eq('id', B.uid);
  ok(codeErr, "players can't change their player ID");
  const { error: joinErr } = await D.client.from('group_members').insert({ group_id: '00000000-0000-0000-0000-000000000000', player_id: D.uid, role: 'leader' });
  ok(joinErr, "players can't insert themselves into a squad directly");
  const { data: peek } = await B.client.from('player_notifications').select('id').eq('recipient_id', A.uid);
  ok((peek ?? []).length === 0, "players can't read each other's notifications");
  const { error: anonRun } = await pub.rpc('start_mission', { p_mission: 'mission-01' });
  ok(anonRun, "visitors can't start a mission");
  const { error: fakeRun } = await B.client.rpc('complete_mission', { p_run: '00000000-0000-0000-0000-000000000000', p_status: 'SUCCESS', p_science: 9999, p_fuel_pct: 100, p_risk_pct: 0 });
  ok(fakeRun, 'forged mission results are rejected');

  console.log('[squad]');
  const members = async () => {
    const { data } = await A.client.from('group_members').select('player_id, role, group:groups(id, name, owner_id)').order('joined_at');
    return data ?? [];
  };
  const m0 = await members();
  const grp = (Array.isArray(m0[0]?.group) ? m0[0]?.group[0] : m0[0]?.group) as { id: string; name: string; owner_id: string } | undefined;
  ok(grp?.name === SQUAD_NAME, `primary account is in "${SQUAD_NAME}"`);
  ok(grp?.owner_id === A.uid && m0.find(m => m.player_id === A.uid)?.role === 'leader', 'primary account is the squad leader');
  ok(m0.length === 3 && [B.uid, C.uid].every(id => m0.some(m => m.player_id === id)), 'squad has exactly three members: leader, Nova and Kai', `${m0.length}`);

  const { error: memberKick } = await B.client.rpc('remove_group_member', { p_player: C.uid });
  ok(/NOT_GROUP_LEADER/.test(memberKick?.message ?? ''), 'only the leader can remove members');

  // Capacity is four: fill the last seat, then check the fifth invitation and acceptance are rejected
  let restored = false;
  try {
    const invD = await A.client.rpc('invite_to_group', { p_invitee: D.uid });
    ok(!invD.error, 'a player outside the squad can be invited', invD.error?.message);
    const invE = await A.client.rpc('invite_to_group', { p_invitee: E.uid });
    ok(!invE.error, 'a second outsider can be invited while a seat is free', invE.error?.message);
    const accD = await D.client.rpc('respond_to_invitation', { p_invitation: invD.data, p_accept: true });
    ok(!accD.error, 'fourth member can accept', accD.error?.message);
    ok((await members()).length === 4, 'squad has four members');
    const accE = await E.client.rpc('respond_to_invitation', { p_invitation: invE.data, p_accept: true });
    ok(/GROUP_FULL/.test(accE.error?.message ?? ''), 'fifth acceptance is rejected by the database', accE.error?.message ?? 'accepted!');
    const { error: fullInvite } = await A.client.rpc('invite_to_group', { p_invitee: E.uid });
    ok(/GROUP_FULL/.test(fullInvite?.message ?? '') || /INVITE_ALREADY_PENDING/.test(fullInvite?.message ?? ''), 'inviting a 5th player to a full squad is rejected', fullInvite?.message);
    await A.client.rpc('cancel_invitation', { p_invitation: invE.data });
  } finally {
    // restore: leader + Nova + Kai
    const { data: dm } = await D.client.from('group_members').select('group_id').eq('player_id', D.uid).maybeSingle();
    if (dm) await D.client.rpc('leave_group');
    const { data: em } = await E.client.from('group_members').select('group_id').eq('player_id', E.uid).maybeSingle();
    if (em) await E.client.rpc('leave_group');
    const { data: cm } = await C.client.from('group_members').select('group_id').eq('player_id', C.uid).maybeSingle();
    if (!cm) {
      const inv = await A.client.rpc('invite_to_group', { p_invitee: C.uid });
      const id = inv.data ?? (await C.client.from('group_invitations').select('id').eq('invitee_id', C.uid).eq('status', 'pending').limit(1).maybeSingle()).data?.id;
      if (id) await C.client.rpc('respond_to_invitation', { p_invitation: id, p_accept: true });
    }
    const final = await members();
    restored = final.length === 3 && [A.uid, B.uid, C.uid].every(id => final.some(m => m.player_id === id));
  }
  ok(restored, 'squad restored to leader, Nova and Kai');

  console.log('[leaderboards]');
  const lbAnon = await pub.rpc('get_leaderboard', { p_category: 'xp', p_period: 'all', p_limit: 50 });
  ok(!lbAnon.error && Array.isArray(lbAnon.data), 'visitors can read the pilot leaderboard', lbAnon.error?.message ?? `${lbAnon.data?.length} rows`);
  const lbMe = await A.client.rpc('get_leaderboard', { p_category: 'credits', p_period: 'week', p_limit: 10 });
  ok(!lbMe.error, 'weekly credits board loads for a player', lbMe.error?.message);
  const lbSquad = await pub.rpc('get_group_leaderboard', { p_period: 'all', p_limit: 50 });
  ok(!lbSquad.error && (lbSquad.data as { name: string }[]).some(g => g.name === SQUAD_NAME), `squad board lists "${SQUAD_NAME}"`, lbSquad.error?.message);

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    console.log('[app]');
    for (const path of ['/squad', '/leaderboard', '/status']) {
      const html = await fetch(new URL(path, appUrl)).then(r => r.text()).catch(() => '');
      ok(html && !/not set up on the server|not initialised|FAILED/.test(html), `${path} renders without a database warning`);
    }
  }

  for (const x of Object.values(s)) await x.client.auth.signOut();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch(e => { console.error(`\nVerification stopped: ${(e as Error).message}`); console.log(`${passed} passed, ${failed} failed`); process.exit(1); });
