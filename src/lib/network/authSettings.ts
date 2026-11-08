import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

/** Whether the Google provider is enabled on the Supabase project (public auth settings endpoint). */
export async function isGoogleEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY }, next: { revalidate: 300 } });
    if (!res.ok) return false;
    const json = (await res.json()) as { external?: { google?: boolean } };
    return Boolean(json.external?.google);
  } catch {
    return false;
  }
}
