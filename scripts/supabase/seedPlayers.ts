/**
 * Seeds five real Supabase Auth accounts and the "Orbital Pioneers" test squad.
 *
 *   npm run seed:players
 *
 * Needs in .env.local: SUPABASE_SERVICE_ROLE_KEY and SEED_PRIMARY_PASSWORD.
 * Idempotent: existing users are updated, never duplicated; an existing squad
 * is reused. Passwords are never printed. The four generated test passwords
 * are stored in .seed-credentials.local.json (gitignored, mode 600).
 *
 * Profiles and player IDs come from the database trigger on auth.users, so the
 * seed goes through the same path as a real sign-up. Squad membership goes
 * through the real invite/accept RPCs, signed in as each player.
 */
import {
  PILOTS, SQUAD_NAME, adminClient, findUsersByEmail, generatePassword, loadCredentials, mask, passwordFor,
  requireSchema, saveCredentials, signIn, type PilotSpec,
} from './shared';
import { randomInt } from 'node:crypto';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const randomCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

async function main() {
  const admin = adminClient();
  const health = await requireSchema(admin);
  console.log(`Schema v${health.schema_version} found (${health.missions} missions).`);

  const store = loadCredentials();
  for (const p of PILOTS) {
    if (!p.primary && !store[p.key]) store[p.key] = { email: p.email, password: generatePassword() };
  }
  saveCredentials(store);

  const existing = await findUsersByEmail(admin);
  const ids = new Map<string, string>();

  // ── 1. Auth accounts ──
  for (const p of PILOTS) {
    const password = passwordFor(p, store)!;
    const found = existing.get(p.email.toLowerCase());
    if (found) {
      const { error } = await admin.auth.admin.updateUserById(found.id, { password, email_confirm: true });
      if (error) throw new Error(`Updating ${mask(p.email)} failed: ${error.message}`);
      ids.set(p.key, found.id);
      console.log(`  = ${p.displayName.padEnd(12)} account exists, password synced`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: p.email, password, email_confirm: true,
        user_metadata: { username: p.username, display_name: p.displayName },
      });
      if (error || !data.user) throw new Error(`Creating ${mask(p.email)} failed: ${error?.message}`);
      ids.set(p.key, data.user.id);
      console.log(`  + ${p.displayName.padEnd(12)} account created`);
    }
  }

  // ── 2. Profiles + statistics ──
  for (const p of PILOTS) {
    const id = ids.get(p.key)!;
    let { data: profile } = await admin.from('profiles').select('id, player_code, username').eq('id', id).maybeSingle();
    if (!profile) {
      // Account created before the migration ran, so the signup trigger never fired for it
      for (let attempt = 0; attempt < 8 && !profile; attempt++) {
        const username = attempt === 0 ? p.username : `${p.username.slice(0, 13)}_${randomCode().toLowerCase()}`;
        const { data, error } = await admin.from('profiles')
          .insert({ id, player_code: `MC-${randomCode()}`, username, display_name: p.displayName })
          .select('id, player_code, username').single();
        if (data) profile = data;
        else if (error && error.code !== '23505') throw new Error(`Profile for ${p.displayName}: ${error.message}`);
      }
      if (!profile) throw new Error(`Could not create a unique profile for ${p.displayName}.`);
      console.log(`  + ${p.displayName.padEnd(12)} profile backfilled`);
    }
    // Cosmetic fields only. Player ID, username and registration date are immutable (DB trigger).
    const { error: upErr } = await admin.from('profiles').update({ display_name: p.displayName, avatar: p.avatar, bio: p.bio }).eq('id', id);
    if (upErr) throw new Error(`Updating profile for ${p.displayName}: ${upErr.message}`);
    // Starting balance comes from column defaults (1,000 credits, 0 XP, 0 science). Existing progress is kept.
    const { error: stErr } = await admin.from('player_statistics').upsert({ player_id: id }, { onConflict: 'player_id', ignoreDuplicates: true });
    if (stErr) throw new Error(`Statistics for ${p.displayName}: ${stErr.message}`);
    console.log(`    ${profile.player_code}  @${profile.username}`);
  }

  // ── 3. Squad, through the real RPCs ──
  const leaderSpec = PILOTS.find(p => p.primary)!;
  const leader = await signIn(leaderSpec.email, passwordFor(leaderSpec, store)!);
  const { data: mine } = await leader.client.from('group_members').select('group_id, role, group:groups(name, group_code)').eq('player_id', leader.uid).maybeSingle();
  let groupId: string;
  if (!mine) {
    const { data, error } = await leader.client.rpc('create_group', {
      p_name: SQUAD_NAME, p_description: 'Test squad for multiplayer QA.', p_emblem: 'orbit-cyan', p_specialization: 'MOON',
    });
    if (error) throw new Error(`create_group: ${error.message}`);
    groupId = (data as { id: string }).id;
    console.log(`\n  + Squad "${SQUAD_NAME}" created (${(data as { group_code: string }).group_code})`);
  } else {
    const g = (Array.isArray(mine.group) ? mine.group[0] : mine.group) as { name: string; group_code: string };
    if (g.name !== SQUAD_NAME) {
      console.warn(`\n  ! ${leaderSpec.displayName} already belongs to "${g.name}". Leaving that squad alone; squad seed skipped.`);
      return finish(ids);
    }
    groupId = mine.group_id as string;
    console.log(`\n  = Squad "${SQUAD_NAME}" exists (${g.group_code})`);
  }

  for (const p of PILOTS.filter(x => x.squad && !x.primary)) await ensureMember(p, groupId, leader.client, ids, store);
  await finish(ids);
}

async function ensureMember(
  p: PilotSpec, groupId: string, leaderClient: Awaited<ReturnType<typeof signIn>>['client'],
  ids: Map<string, string>, store: ReturnType<typeof loadCredentials>,
) {
  const admin = adminClient();
  const uid = ids.get(p.key)!;
  const { data: m } = await admin.from('group_members').select('group_id').eq('player_id', uid).maybeSingle();
  if (m?.group_id === groupId) { console.log(`  = ${p.displayName} already a member`); return; }
  if (m) { console.warn(`  ! ${p.displayName} is in another squad; skipped.`); return; }

  const { error: invErr } = await leaderClient.rpc('invite_to_group', { p_invitee: uid });
  if (invErr && !/INVITE_ALREADY_PENDING/.test(invErr.message)) throw new Error(`Inviting ${p.displayName}: ${invErr.message}`);

  const member = await signIn(p.email, passwordFor(p, store)!);
  const { data: inv } = await member.client.from('group_invitations').select('id')
    .eq('invitee_id', uid).eq('group_id', groupId).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!inv) throw new Error(`No pending invitation found for ${p.displayName}.`);
  const { error } = await member.client.rpc('respond_to_invitation', { p_invitation: inv.id, p_accept: true });
  if (error) throw new Error(`${p.displayName} accepting: ${error.message}`);
  console.log(`  + ${p.displayName} invited and accepted`);
}

async function finish(ids: Map<string, string>) {
  const admin = adminClient();
  const { count: profiles } = await admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', [...ids.values()]);
  console.log(`\nDone: ${ids.size} auth accounts, ${profiles ?? 0} profiles.`);
  console.log('Test passwords: .seed-credentials.local.json (gitignored). Primary password: SEED_PRIMARY_PASSWORD.');
  console.log('Next: npm run verify:supabase');
}

main().catch(e => { console.error(`\nSeed failed: ${(e as Error).message}`); process.exit(1); });
