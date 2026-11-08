import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/** Next.js 16 Proxy (formerly Middleware): the single place that refreshes Supabase sessions. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // everything except static assets, images and textures
    '/((?!_next/static|_next/image|favicon.ico|textures/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
