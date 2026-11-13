
/** Server-only helpers for api.nasa.gov. The key never reaches the browser. */
export const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
export const NASA_KEY_MODE: 'personal' | 'demo' = process.env.NASA_API_KEY ? 'personal' : 'demo';

export async function getJson<T>(url: string, revalidate = 600, timeoutMs = 9000): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
