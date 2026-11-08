/**
 * Bulk demo data: N demo pilots (default 2,000) with mission history, squads
 * and achievements, for load testing and populated leaderboards.
 *
 *   npm run seed:demo                 # 2,000 pilots
 *   npm run seed:demo -- --count=500
 *   npm run seed:demo -- --clean      # delete every demo pilot and demo squad
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local, and the migrations applied.
 *
 * Every demo account:
 *   - is a real Supabase Auth user (email demo-pilot-NNNN@example.com, a
 *     reserved domain) with a random password that is thrown away, so nobody
 *     can sign in as it;
 *   - is tagged app_metadata.demo = true and has the bio "Demo pilot (seed data)".
 * Results use the same scoring and reward formula as complete_mission(), and
 * statistics, squad totals and achievements are derived from those results.
 *
 * Idempotent: existing demo users are reused; squads and mission history are
 * only generated for demo pilots that don't have any yet.
 */
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { adminClient, findUsersByEmail, requireSchema } from './shared';

const args = new Map(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=') as [string, string | undefined]));
const COUNT = Math.min(Math.max(Number(args.get('count') ?? 2000) || 2000, 1), 10000);
const CLEAN = args.has('clean');
const DEMO_BIO = 'Demo pilot (seed data)';
const DEMO_SQUAD = 'Demo squad (seed data).';
const DOMAIN = 'example.com';
const email = (i: number) => `demo-pilot-${String(i).padStart(4, '0')}@${DOMAIN}`;

const FIRST = ['ava', 'leo', 'mia', 'noah', 'zara', 'kai', 'ivy', 'omar', 'luna', 'ezra', 'nina', 'ravi', 'sara', 'theo', 'yuki', 'amir', 'lena', 'jonas', 'maya', 'arjun', 'chen', 'ines', 'tariq', 'elif', 'diego', 'hana', 'felix', 'nadia', 'samir', 'olga', 'kofi', 'aisha', 'mateo', 'sofia', 'ibrahim', 'priya', 'lucas', 'emma', 'fatima', 'hugo'];
const LAST = ['reyes', 'okafor', 'brandt', 'mehta', 'tanaka', 'silva', 'novak', 'haddad', 'larsen', 'kim', 'rahman', 'costa', 'ivanova', 'mensah', 'dubois', 'ozturk', 'park', 'nair', 'fischer', 'santos', 'ali', 'moreau', 'hossain', 'kowalski', 'garcia', 'chowdhury', 'yilmaz', 'nguyen', 'popescu', 'adeyemi'];
const SQUAD_A = ['Apollo', 'Artemis', 'Orion', 'Vega', 'Lyra', 'Nova', 'Polaris', 'Helios', 'Kepler', 'Cassini', 'Voyager', 'Pioneer', 'Juno', 'Hubble', 'Titan', 'Europa', 'Ceres', 'Sirius', 'Rigel', 'Altair'];
const SQUAD_B = ['Vanguard', 'Pathfinders', 'Navigators', 'Wardens', 'Survey Corps', 'Flight Crew', 'Rangers', 'Collective', 'Expedition', 'Relay', 'Lancers', 'Outpost'];
const SHAPES = ['orbit', 'nova', 'comet', 'ring', 'rocket', 'planet', 'star', 'moon'];
const COLORS = ['cyan', 'violet', 'amber', 'emerald', 'rose', 'sky'];
const SPECS = ['MOON', 'MARS', 'NEO', 'EO', 'DEEP', null];
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const pick = <T,>(a: readonly T[]) => a[randomInt(a.length)];
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const code4 = () => Array.from({ length: 4 }, () => pick(CODE_ALPHABET.split(''))).join('');

async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  }));
}

interface Mission { id: string; reward_credits: number; min_science: number; science_cap: number; base_xp: number }

/** Mirrors public.complete_mission() exactly. */
function score(ms: Mission, reported: 'SUCCESS' | 'PARTIAL' | 'FAILURE', science: number, fuel: number, risk: number) {
  let status = reported;
  const sci = Math.min(Math.max(Math.round(science), 0), ms.science_cap);
  if (status === 'SUCCESS' && (sci < ms.min_science || risk >= 70)) status = 'PARTIAL';
  const sciS = Math.min(100, Math.round(Math.min(1.2, sci / ms.min_science) * 85));
  const safeS = Math.max(10, Math.min(100, Math.round(100 - risk)));
  const fuelS = Math.min(100, Math.round(fuel * 1.1));
  let s = Math.round(sciS * 0.45 + safeS * 0.35 + fuelS * 0.2);
  if (status === 'FAILURE') s = Math.min(s, 45);
  const credits = status === 'SUCCESS' ? ms.reward_credits : status === 'PARTIAL' ? Math.floor(ms.reward_credits / 2) : 0;
  const xp = Math.round(ms.base_xp * (status === 'SUCCESS' ? 1 : status === 'PARTIAL' ? 0.5 : 0.2)) + s;
  return { status, sci, score: s, credits, xp };
}

async function clean() {
  const admin = adminClient();
  const users = [...(await findUsersByEmail(admin)).entries()].filter(([e]) => /^demo-pilot-\d+@/.test(e));
  const { error: gErr } = await admin.from('groups').delete().eq('description', DEMO_SQUAD);
  if (gErr) throw new Error(`Deleting demo squads: ${gErr.message}`);
  let done = 0;
  await pool(users, 8, async ([, u]) => {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) console.warn(`  ! ${error.message}`);
    if (++done % 200 === 0) console.log(`  deleted ${done}/${users.length}`);
  });
  console.log(`Removed ${users.length} demo pilots and their squads, results and achievements.`);
}

async function main() {
  const admin = adminClient();
  await requireSchema(admin);
  if (CLEAN) return clean();

  const { data: missions, error: mErr } = await admin.from('missions').select('id, reward_credits, min_science, science_cap, base_xp');
  if (mErr || !missions?.length) throw new Error(`Mission catalog: ${mErr?.message ?? 'empty'}`);

  // ── 1. Auth users (profiles come from the signup trigger) ──
  console.log(`Creating up to ${COUNT} demo pilots…`);
  const existing = await findUsersByEmail(admin);
  const ids: string[] = [];
  const todo: number[] = [];
  for (let i = 1; i <= COUNT; i++) {
    const u = existing.get(email(i));
    if (u) ids[i - 1] = u.id; else todo.push(i);
  }
  let created = 0;
  await pool(todo, 8, async i => {
    const first = pick(FIRST); const last = pick(LAST);
    const username = `${first}_${last}`.slice(0, 15) + `_${String(i).padStart(4, '0')}`;
    const { data, error } = await admin.auth.admin.createUser({
      email: email(i),
      password: randomBytes(24).toString('base64url'), // discarded: demo accounts can't be signed into
      email_confirm: true,
      user_metadata: { username, display_name: `${first[0].toUpperCase()}${first.slice(1)} ${last[0].toUpperCase()}${last.slice(1)}` },
      app_metadata: { demo: true },
    });
    if (error || !data.user) throw new Error(`Creating ${email(i)}: ${error?.message}`);
    ids[i - 1] = data.user.id;
    if (++created % 100 === 0) console.log(`  ${created}/${todo.length} created`);
  });
  console.log(`  ${created} created, ${COUNT - todo.length} already existed`);

  // ── 2. Profiles: avatar, bio, spread-out join dates ──
  const profiles: { id: string; player_code: string; username: string; display_name: string }[] = [];
  for (const c of chunk(ids, 200)) {
    const { data, error } = await admin.from('profiles').select('id, player_code, username, display_name').in('id', c);
    if (error) throw new Error(`Loading profiles: ${error.message}`);
    profiles.push(...(data ?? []));
  }
  if (profiles.length !== ids.length) throw new Error(`Only ${profiles.length}/${ids.length} profiles exist. Is the signup trigger installed?`);
  for (const c of chunk(profiles, 500)) {
    const { error } = await admin.from('profiles').upsert(c.map(p => ({ ...p, avatar: `${pick(SHAPES)}-${pick(COLORS)}`, bio: DEMO_BIO })));
    if (error) throw new Error(`Updating profiles: ${error.message}`);
  }

  // Only generate history/squads for demo pilots that have none yet
  const busy = new Set<string>();
  for (const c of chunk(ids, 200)) {
    const { data } = await admin.from('mission_results').select('player_id').in('player_id', c);
    data?.forEach(r => busy.add(r.player_id as string));
  }
  const grouped = new Set<string>();
  for (const c of chunk(ids, 200)) {
    const { data } = await admin.from('group_members').select('player_id').in('player_id', c);
    data?.forEach(r => grouped.add(r.player_id as string));
  }
  const fresh = profiles.filter(p => !busy.has(p.id));

  // ── 3. Squads: about 40% of fresh pilots, in squads of 2–3 ──
  const squadOf = new Map<string, string>();
  const squadCandidates = fresh.filter(p => !grouped.has(p.id) && Math.random() < 0.4);
  const groups: { id: string; group_code: string; name: string; description: string; emblem: string; specialization: string | null; owner_id: string; created_at: string }[] = [];
  const members: { group_id: string; player_id: string; role: string; joined_at: string }[] = [];
  for (let i = 0; i + 1 < squadCandidates.length;) {
    const size = i + 2 < squadCandidates.length && Math.random() < 0.7 ? 3 : 2;
    const crew = squadCandidates.slice(i, i + size); i += size;
    const a = pick(SQUAD_A); const b = pick(SQUAD_B);
    const id = randomUUID();
    const since = new Date(Date.now() - rand(30, 120) * 864e5).toISOString();
    groups.push({
      id, group_code: `GRP-${(a.slice(0, 2) + b.slice(0, 1)).toUpperCase().replace(/[^A-Z]/g, 'X')}-${code4()}`,
      name: `${a} ${b}`.slice(0, 32), description: DEMO_SQUAD, emblem: `${pick(SHAPES)}-${pick(COLORS)}`,
      specialization: pick(SPECS), owner_id: crew[0].id, created_at: since,
    });
    crew.forEach((p, k) => { members.push({ group_id: id, player_id: p.id, role: k === 0 ? 'leader' : 'member', joined_at: since }); squadOf.set(p.id, id); });
  }
  for (const c of chunk(groups, 500)) {
    const { error } = await admin.from('groups').insert(c);
    if (error) throw new Error(`Creating squads: ${error.message}`);
  }
  for (const c of chunk(members, 500)) {
    const { error } = await admin.from('group_members').insert(c); // capacity trigger still enforces ≤ 3
    if (error) throw new Error(`Adding squad members: ${error.message}`);
  }
  console.log(`  ${groups.length} squads, ${members.length} squad members`);

  // ── 4. Mission history (last 90 days, so weekly and monthly boards fill too) ──
  const runs: Record<string, unknown>[] = [];
  const results: Record<string, unknown>[] = [];
  const stats = new Map<string, { credits: number; xp: number; science: number; started: number; done: number; failed: number; squad: number; best: number }>();
  const gTotals = new Map<string, { credits: number; xp: number; science: number; done: number }>();
  const unlocked = new Map<string, Set<string>>();
  const ACH: Record<string, string> = { 'mission-01': 'lunar-explorer', 'mission-02': 'mars-pathfinder', 'mission-03': 'deep-space-pioneer', 'mission-04': 'earth-sentinel' };

  for (const p of fresh) {
    const skill = Math.random() ** 0.7; // most pilots are decent, a few are excellent
    const n = [0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 8, 12][randomInt(12)];
    const st = { credits: 1000, xp: 0, science: 0, started: n, done: 0, failed: 0, squad: 0, best: 0 };
    const ach = new Set<string>(n ? ['first-launch'] : []);
    for (let k = 0; k < n; k++) {
      const ms = pick(missions) as Mission;
      const roll = Math.random();
      const reported = roll < 0.15 + skill * 0.6 ? 'SUCCESS' : roll < 0.85 ? 'PARTIAL' : 'FAILURE';
      const science = ms.min_science * rand(0.5, 1.1 + skill * 1.2);
      const fuel = rand(20, 60 + skill * 40);
      const risk = rand(5, 75 - skill * 50);
      const r = score(ms, reported, science, fuel, risk);
      const gid = squadOf.get(p.id) && Math.random() < 0.4 ? squadOf.get(p.id)! : null;
      const dur = randomInt(120, 900);
      const end = new Date(Date.now() - rand(0, 90) * 864e5);
      const runId = randomUUID();
      runs.push({ id: runId, player_id: p.id, mission_id: ms.id, state: 'completed', started_at: new Date(end.getTime() - dur * 1000).toISOString(), completed_at: end.toISOString() });
      results.push({ run_id: runId, player_id: p.id, mission_id: ms.id, group_id: gid, status: r.status, science: r.sci, score: r.score, credits_awarded: r.credits, xp_awarded: r.xp, duration_sec: dur, completed_at: end.toISOString() });
      st.credits += r.credits; st.xp += r.xp; st.science += r.sci; st.best = Math.max(st.best, r.score);
      if (r.status === 'FAILURE') st.failed++; else st.done++;
      if (gid && r.status !== 'FAILURE') { st.squad++; ach.add('squad-operative'); }
      if (r.status === 'SUCCESS') ach.add(ACH[ms.id]);
      if (r.score >= 90) ach.add('master-engineer');
      if (gid) {
        const g = gTotals.get(gid) ?? { credits: 0, xp: 0, science: 0, done: 0 };
        g.credits += r.credits; g.xp += r.xp; g.science += r.sci; if (r.status !== 'FAILURE') g.done++;
        gTotals.set(gid, g);
      }
    }
    if (st.science >= 500) ach.add('science-specialist');
    stats.set(p.id, st);
    unlocked.set(p.id, ach);
  }

  for (const c of chunk(runs, 1000)) {
    const { error } = await admin.from('mission_runs').insert(c);
    if (error) throw new Error(`Mission runs: ${error.message}`);
  }
  for (const c of chunk(results, 1000)) {
    const { error } = await admin.from('mission_results').insert(c);
    if (error) throw new Error(`Mission results: ${error.message}`);
  }
  console.log(`  ${results.length} mission results`);

  const statRows = [...stats].map(([player_id, s]) => ({
    player_id, credits: s.credits, xp: s.xp, science_total: s.science, missions_started: s.started,
    missions_completed: s.done, missions_failed: s.failed, group_missions_completed: s.squad, best_score: s.best,
  }));
  for (const c of chunk(statRows, 500)) {
    const { error } = await admin.from('player_statistics').upsert(c, { onConflict: 'player_id' });
    if (error) throw new Error(`Statistics: ${error.message}`);
  }
  const groupRows = groups.map(g => {
    const t = gTotals.get(g.id) ?? { credits: 0, xp: 0, science: 0, done: 0 };
    return { ...g, credits: t.credits, xp_total: t.xp, science_total: t.science, missions_completed: t.done };
  });
  for (const c of chunk(groupRows, 500)) {
    const { error } = await admin.from('groups').upsert(c);
    if (error) throw new Error(`Squad totals: ${error.message}`);
  }
  const achRows = [...unlocked].flatMap(([player_id, set]) => [...set].map(achievement_id => ({ player_id, achievement_id })));
  for (const c of chunk(achRows, 1000)) {
    const { error } = await admin.from('player_achievements').upsert(c, { onConflict: 'player_id,achievement_id', ignoreDuplicates: true });
    if (error) throw new Error(`Achievements: ${error.message}`);
  }
  console.log(`  ${achRows.length} achievements unlocked`);
  console.log(`\nDone: ${profiles.length} demo pilots. Remove them any time with: npm run seed:demo -- --clean`);
}

main().catch(e => { console.error(`\nDemo seed failed: ${(e as Error).message}`); process.exit(1); });
