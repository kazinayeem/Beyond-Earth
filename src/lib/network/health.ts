/**
 * Multiplayer health check (server only). Each step reports what actually
 * happened, so the UI never claims "ready" for something it didn't verify.
 */
import { createClient } from '@/lib/supabase/server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

export type CheckState = 'ok' | 'fail' | 'skip';
export interface HealthCheck { id: 'database' | 'auth' | 'profile' | 'multiplayer'; label: string; state: CheckState; detail: string }
export type SystemState = 'config_missing' | 'unreachable' | 'migration_missing' | 'permission_denied' | 'auth_unavailable' | 'schema_incomplete' | 'operational';
export interface SystemHealth { ready: boolean; state: SystemState; summary: string; checks: HealthCheck[] }

const SUMMARY: Record<SystemState, string> = {
  config_missing: 'Supabase is not configured for this deployment.',
  unreachable: "Can't reach the Supabase project.",
  migration_missing: 'Connected, but the multiplayer migrations have not been applied.',
  permission_denied: 'Connected, but the database refused access. The grants from the migrations are missing or were changed.',
  auth_unavailable: 'Database is ready, but Supabase Auth is not accepting email sign-ins.',
  schema_incomplete: 'Connected, but the multiplayer schema is incomplete.',
  operational: 'All systems operational.',
};

interface HealthPayload {
  schema_version: number;
  missing_tables: string[];
  rls_disabled: string[];
  signup_trigger: boolean;
  missions: number;
  achievements: number;
}

/** A PostgREST or Postgres error code means the request reached the database. */
const reachedServer = (code: string | undefined) => Boolean(code && (/^PGRST/.test(code) || /^[0-9A-Z]{5}$/.test(code)));

export async function getSystemHealth(): Promise<SystemHealth> {
  if (!isSupabaseConfigured) {
    const missing: HealthCheck[] = [
      { id: 'database', label: 'Database connected', state: 'fail', detail: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set.' },
      { id: 'auth', label: 'Authentication ready', state: 'skip', detail: 'Waiting for the database connection.' },
      { id: 'profile', label: 'Player profile ready', state: 'skip', detail: 'Waiting for the database connection.' },
      { id: 'multiplayer', label: 'Multiplayer system ready', state: 'skip', detail: 'Waiting for the database connection.' },
    ];
    return { ready: false, state: 'config_missing', summary: SUMMARY.config_missing, checks: missing };
  }

  const supabase = await createClient();

  // 1 + 4: one call tells us both whether Supabase answers and whether the schema is in place
  const { data, error } = await supabase.rpc('multiplayer_health');
  const health = (error ? null : data) as HealthPayload | null;
  const connected = !error || reachedServer(error.code);
  const database: HealthCheck = connected
    ? { id: 'database', label: 'Database connected', state: 'ok', detail: `Connected to ${new URL(SUPABASE_URL).host}.` }
    : { id: 'database', label: 'Database connected', state: 'fail', detail: `Can't reach Supabase (${error?.message || 'network error'}).` };

  let state: SystemState | null = connected ? null : 'unreachable';
  let multiplayer: HealthCheck;
  if (!connected) {
    multiplayer = { id: 'multiplayer', label: 'Multiplayer system ready', state: 'skip', detail: 'Waiting for the database connection.' };
  } else if (!health && error?.code === '42501') {
    state = 'permission_denied';
    multiplayer = { id: 'multiplayer', label: 'Multiplayer system ready', state: 'fail', detail: 'Permission denied on the health check. Re-apply the migrations to restore their grants.' };
  } else if (!health) {
    state = error?.code === 'PGRST202' || error?.code === 'PGRST205' ? 'migration_missing' : 'schema_incomplete';
    multiplayer = {
      id: 'multiplayer', label: 'Multiplayer system ready', state: 'fail',
      detail: error?.code === 'PGRST202' || error?.code === 'PGRST205'
        ? 'The multiplayer tables are not in this Supabase project yet. Run the SQL files in supabase/migrations/ in order (see docs/multiplayer.md).'
        : `The health check failed: ${error?.message ?? 'unknown error'}.`,
    };
  } else {
    const problems: string[] = [];
    if (health.missing_tables.length) problems.push(`missing tables: ${health.missing_tables.join(', ')}`);
    if (health.rls_disabled.length) problems.push(`RLS off on: ${health.rls_disabled.join(', ')}`);
    if (!health.signup_trigger) problems.push('the new-player trigger on auth.users is missing');
    if (!health.missions) problems.push('the mission catalog is empty');
    if (problems.length) state = 'schema_incomplete';
    multiplayer = problems.length
      ? { id: 'multiplayer', label: 'Multiplayer system ready', state: 'fail', detail: `Schema is incomplete: ${problems.join('; ')}.` }
      : { id: 'multiplayer', label: 'Multiplayer system ready', state: 'ok', detail: `Schema v${health.schema_version}: ${health.missions} missions, ${health.achievements} achievements, RLS on every table.` };
  }

  // 2: Auth service answers and email sign-in is on
  let auth: HealthCheck;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY }, cache: 'no-store' });
    const json = res.ok ? ((await res.json()) as { external?: { email?: boolean } }) : null;
    auth = json?.external?.email
      ? { id: 'auth', label: 'Authentication ready', state: 'ok', detail: 'Email sign-in is enabled.' }
      : { id: 'auth', label: 'Authentication ready', state: 'fail', detail: res.ok ? 'Email sign-in is disabled in Supabase Auth settings.' : `Auth service answered ${res.status}.` };
  } catch {
    auth = { id: 'auth', label: 'Authentication ready', state: 'fail', detail: "Can't reach the Supabase Auth service." };
  }

  // 3: The signed-in player has a profile row
  let profile: HealthCheck;
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub ?? null;
  if (!uid) {
    profile = { id: 'profile', label: 'Player profile ready', state: 'skip', detail: 'Sign in to check your profile.' };
  } else if (multiplayer.state !== 'ok') {
    profile = { id: 'profile', label: 'Player profile ready', state: 'skip', detail: 'Waiting for the multiplayer schema.' };
  } else {
    const { data: row, error: pErr } = await supabase.from('profiles').select('player_code').eq('id', uid).maybeSingle();
    profile = row
      ? { id: 'profile', label: 'Player profile ready', state: 'ok', detail: `Signed in as ${row.player_code}.` }
      : {
          id: 'profile', label: 'Player profile ready', state: 'fail',
          detail: pErr
            ? `Couldn't load your profile: ${pErr.message}.`
            : 'Your account has no player profile yet. Open your profile page and it will be created automatically.',
        };
  }

  if (!state && auth.state !== 'ok') state = 'auth_unavailable';
  const final: SystemState = state ?? 'operational';
  const checks = [database, auth, profile, multiplayer];
  return { ready: final === 'operational' && profile.state !== 'fail', state: final, summary: SUMMARY[final], checks };
}
