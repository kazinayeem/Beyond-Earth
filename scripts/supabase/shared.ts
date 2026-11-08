/**
 * Shared setup for the trusted Supabase scripts (seed + live verification).
 * These run in Node only. They are never imported by the Next.js app, so the
 * service-role key cannot end up in a browser bundle.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(__dirname, '..', '..');
export const CREDENTIALS_FILE = join(ROOT, '.seed-credentials.local.json');
export const SQUAD_NAME = 'Orbital Pioneers';

for (const f of ['.env.local', '.env']) {
  const p = join(ROOT, f);
  if (existsSync(p)) process.loadEnvFile(p);
}

export function env(name: string, required = true): string {
  const v = process.env[name]?.trim() ?? '';
  if (!v && required) throw new Error(`${name} is not set. Add it to .env.local (never commit it).`);
  return v;
}

export const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL');
export const PUBLISHABLE_KEY = env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

export function adminClient(): SupabaseClient {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (key.startsWith('sb_publishable_')) throw new Error('SUPABASE_SERVICE_ROLE_KEY holds a publishable key. Use the secret / service_role key.');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function publicClient(): SupabaseClient {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface PilotSpec {
  key: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  primary?: boolean;
  /** joins the test squad */
  squad: boolean;
}

const TEST_DOMAIN = process.env.SEED_TEST_EMAIL_DOMAIN?.trim() || 'example.com'; // RFC 2606 reserved: never delivers to a real person

export const PILOTS: PilotSpec[] = [
  {
    key: 'primary', primary: true, squad: true,
    email: process.env.SEED_PRIMARY_EMAIL?.trim() || 'kazinayeem55085@gmail.com',
    username: process.env.SEED_PRIMARY_USERNAME?.trim() || 'kazinayeem',
    displayName: process.env.SEED_PRIMARY_DISPLAY_NAME?.trim() || 'Kazi Nayeem',
    avatar: 'rocket-cyan',
    bio: 'Flight director of Orbital Pioneers.',
  },
  { key: 'nova', squad: true, email: `mc-test-nova@${TEST_DOMAIN}`, username: 'nova_reyes', displayName: 'Nova Reyes', avatar: 'nova-violet', bio: 'Propulsion engineer. Test account.' },
  { key: 'kai', squad: true, email: `mc-test-kai@${TEST_DOMAIN}`, username: 'kai_okafor', displayName: 'Kai Okafor', avatar: 'planet-emerald', bio: 'Mission scientist. Test account.' },
  { key: 'lena', squad: false, email: `mc-test-lena@${TEST_DOMAIN}`, username: 'lena_brandt', displayName: 'Lena Brandt', avatar: 'moon-sky', bio: 'Orbital mechanics. Test account.' },
  { key: 'arjun', squad: false, email: `mc-test-arjun@${TEST_DOMAIN}`, username: 'arjun_mehta', displayName: 'Arjun Mehta', avatar: 'comet-amber', bio: 'Systems engineer. Test account.' },
];

type CredentialStore = Record<string, { email: string; password: string }>;

/** Generated passwords for the four test pilots, kept in a gitignored, owner-only file. */
export function loadCredentials(): CredentialStore {
  if (!existsSync(CREDENTIALS_FILE)) return {};
  return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8')) as CredentialStore;
}

export function saveCredentials(store: CredentialStore) {
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  chmodSync(CREDENTIALS_FILE, 0o600);
}

export function generatePassword(): string {
  // 24 random bytes → 32 url-safe chars, plus one of each class for strict password policies
  return `${randomBytes(24).toString('base64url')}Aa1!`;
}

/** Password for a pilot: the primary's comes from SEED_PRIMARY_PASSWORD, never from disk. */
export function passwordFor(p: PilotSpec, store: CredentialStore): string | null {
  if (p.primary) return env('SEED_PRIMARY_PASSWORD');
  return store[p.key]?.password ?? null;
}

export async function signIn(email: string, password: string) {
  const client = publicClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message ?? 'no user'}`);
  return { client, uid: data.user.id };
}

export async function findUsersByEmail(admin: SupabaseClient): Promise<Map<string, { id: string; email_confirmed_at?: string | null }>> {
  const out = new Map<string, { id: string; email_confirmed_at?: string | null }>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Listing auth users failed: ${error.message}`);
    for (const u of data.users) if (u.email) out.set(u.email.toLowerCase(), { id: u.id, email_confirmed_at: u.email_confirmed_at });
    if (data.users.length < 1000) break;
  }
  return out;
}

export interface HealthPayload { schema_version: number; missing_tables: string[]; rls_disabled: string[]; signup_trigger: boolean; missions: number; achievements: number }

/** Stops with instructions if the migrations haven't been applied to this project. */
export async function requireSchema(client: SupabaseClient): Promise<HealthPayload> {
  const { data, error } = await client.rpc('multiplayer_health');
  if (error) {
    throw new Error(
      error.code === 'PGRST202' || error.code === 'PGRST205'
        ? 'The multiplayer schema is not in this Supabase project. Apply the files in supabase/migrations/ first (docs/multiplayer.md, step 1).'
        : `Health check failed: ${error.message}`,
    );
  }
  const h = data as HealthPayload;
  if (h.missing_tables.length || !h.signup_trigger) {
    throw new Error(`Schema incomplete (missing: ${h.missing_tables.join(', ') || 'none'}; signup trigger: ${h.signup_trigger}).`);
  }
  return h;
}

export const mask = (email: string) => email.replace(/^(.{2}).*(@.*)$/, '$1…$2');
