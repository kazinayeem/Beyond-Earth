import { headers } from 'next/headers';

/**
 * Best-effort fixed-window limiter for auth actions, keyed by client IP.
 * State is per server instance, so on multi-instance hosting it's a speed
 * bump, not a guarantee. Supabase Auth applies its own project-wide limits
 * on sign-ups, sign-ins and emails behind it.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function rateLimited(action: string, limit: number, windowMs: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim();
  const key = `${action}:${ip}`;
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count++;
  return b.count > limit;
}
