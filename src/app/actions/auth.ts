'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNext } from '@/lib/network/safeNext';

export interface AuthFormState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
}

async function siteOrigin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? h.get('origin') ?? `https://${h.get('host')}`;
}

const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

const registerSchema = z
  .object({
    email: z.email('Enter a valid email'),
    password: passwordSchema,
    confirm: z.string(),
    displayName: z.string().trim().min(2, '2–32 characters').max(32, '2–32 characters'),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, '3–20 letters, numbers or _'),
  })
  .refine(v => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? 'form');
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export async function registerAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  const { data: available, error: availErr } = await supabase.rpc('username_available', { candidate: v.username });
  if (availErr) return { error: 'Registration is temporarily unavailable (database not initialised).' };
  if (!available) return { fieldErrors: { username: 'That username is taken' } };

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      // metadata only seeds the profile; the DB re-validates username and never uses it for authorization
      data: { username: v.username, display_name: v.displayName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/profile?welcome=1')}`,
    },
  });
  if (error) {
    if (/already registered|exists/i.test(error.message)) return { fieldErrors: { email: 'An account with this email already exists' } };
    if (/password/i.test(error.message)) return { fieldErrors: { password: error.message } };
    return { error: error.message };
  }
  // With email confirmation on, an existing email returns a user with no identities (no error, by design)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { fieldErrors: { email: 'An account with this email already exists' } };
  }
  if (data.session) redirect('/profile?welcome=1');
  return { notice: `Verification link sent to ${v.email}. Confirm your email to activate your pilot ID.` };
}

export async function loginAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? ''), '/profile');
  if (!z.email().safeParse(email).success) return { fieldErrors: { email: 'Enter a valid email' } };
  if (!password) return { fieldErrors: { password: 'Enter your password' } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) return { error: 'Confirm your email first — check your inbox for the verification link.' };
    if (/invalid login/i.test(error.message)) return { error: 'Email or password is incorrect.' };
    return { error: error.message };
  }
  redirect(next);
}

export async function googleAction(form: FormData) {
  const supabase = await createClient();
  const next = safeNext(String(form.get('next') ?? ''), '/profile');
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect('/login?error=oauth_failed');
  redirect(data.url);
}

export async function forgotPasswordAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get('email') ?? '').trim();
  if (!z.email().safeParse(email).success) return { fieldErrors: { email: 'Enter a valid email' } };
  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  // same response whether or not the account exists (no account enumeration)
  return { notice: 'If an account exists for that email, a reset link is on its way.' };
}

export async function resetPasswordAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };
  if (password !== confirm) return { fieldErrors: { confirm: 'Passwords do not match' } };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { error: 'Your reset link has expired. Request a new one.' };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect('/profile?password=updated');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
