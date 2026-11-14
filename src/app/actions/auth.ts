'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNext } from '@/lib/network/safeNext';
import { rateLimited } from '@/lib/network/rateLimit';

export interface AuthFormState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
  /** echo of the submitted username so the form keeps it after an error */
  username?: string;
}

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, '3–20 letters, numbers or _ (no spaces)');

/** Why joining can't proceed, from the database error. */
function joinBlocked(err: { code?: string; message?: string }): string {
  if (err.code === 'PGRST202' || err.code === 'PGRST205') {
    return 'Joining is closed until the game database is updated (the join_game function is missing). Check /status for details.';
  }
  if (!err.code) return "Can't reach the player database right now. Check your connection and try again.";
  return 'Joining hit a database error. Try again in a moment, or check /status.';
}

/**
 * Join the game with a username only (no email, no password).
 *  - mode "new": create a new pilot with this username
 *  - mode "existing": continue as the pilot who owns this username (including older email accounts)
 * The database gives the pilot a username-based login and a one-time random secret; we sign in with it
 * right away, so Supabase sessions, RLS and every RPC keep working unchanged.
 */
export async function joinGameAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return { error: 'Online play is not configured on this server.' };
  const raw = String(form.get('username') ?? '');
  const mode = form.get('mode') === 'existing' ? 'existing' : 'new';
  const next = safeNext(String(form.get('next') ?? ''), '/?view=missions');
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) return { username: raw, fieldErrors: { username: parsed.error.issues[0].message } };
  const username = parsed.data;

  if (await rateLimited('join', 30, 10 * 60_000)) return { username: raw, error: 'Too many join attempts from this network. Wait a few minutes and try again.' };

  const supabase = await createClient();
  let signedIn = false;
  // two players joining the same name at the same instant can overwrite each other's secret: retry once
  for (let attempt = 0; attempt < 2 && !signedIn; attempt++) {
    const secret = randomBytes(24).toString('base64url'); // 32 chars, never stored in clear or shown
    const { data, error } = await supabase.rpc('join_game', { p_username: username, p_secret: secret, p_mode: mode });
    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('USERNAME_TAKEN')) return { username: raw, fieldErrors: { username: 'That username is already taken. Pick another, or use "Returning pilot" if it is yours.' } };
      if (msg.includes('USERNAME_NOT_FOUND')) return { username: raw, fieldErrors: { username: 'No pilot has this username yet. Use "New pilot" to create it.' } };
      if (msg.includes('INVALID_USERNAME')) return { username: raw, fieldErrors: { username: '3–20 letters, numbers or _ (no spaces)' } };
      return { username: raw, error: joinBlocked(error) };
    }
    const login = (data as { login?: string } | null)?.login;
    if (!login) return { username: raw, error: 'Joining failed. Try again.' };
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: login, password: secret });
    if (!signInError) signedIn = true;
    else if (attempt === 1) return { username: raw, error: /rate limit|too many/i.test(signInError.message) ? 'Too many joins right now. Try again in a minute.' : `Could not start your session: ${signInError.message}` };
  }

  await supabase.rpc('ensure_my_profile'); // repairs a pilot whose profile is missing; no-op otherwise
  redirect(next);
}

/** "Leave this username": end the session on this device. The pilot and all progress stay saved under the username. */
export async function leaveUsernameAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/join');
}

/** @deprecated kept for older imports; same as leaveUsernameAction. */
export async function signOutAction() {
  await leaveUsernameAction();
}
