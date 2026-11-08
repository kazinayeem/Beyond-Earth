import { NextResponse } from 'next/server';
import { getSystemHealth } from '@/lib/network/health';

export const dynamic = 'force-dynamic';

/** Public, non-sensitive health summary: states and human-readable details only, no keys or credentials. */
export async function GET() {
  const health = await getSystemHealth();
  return NextResponse.json(health, { status: health.state === 'operational' ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}
