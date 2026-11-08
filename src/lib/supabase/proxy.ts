import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/** Routes that require a signed-in player. Missions, squads, players and rankings are public to browse. */
const PROTECTED = ['/profile', '/notifications'];
/** Auth pages a signed-in player should skip. */
const AUTH_ONLY = ['/login', '/register'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // cache headers prevent a CDN from serving one player's refreshed cookies to another
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run other code between client creation and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = next ? `?next=${encodeURIComponent(next)}` : '';
    const r = NextResponse.redirect(url);
    // carry refreshed auth cookies onto the redirect
    response.cookies.getAll().forEach(c => r.cookies.set(c));
    return r;
  };

  if (!signedIn && PROTECTED.some(p => path === p || path.startsWith(p + '/'))) {
    return redirectTo('/login', path + request.nextUrl.search);
  }
  if (signedIn && AUTH_ONLY.includes(path)) {
    return redirectTo('/profile');
  }
  return response;
}
