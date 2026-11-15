import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/network/safeNext';

/** Email/password sign-in was replaced by username-only "Join game". Old links land there. */
export default async function LegacyAuthRedirect({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.next) params.set('next', safeNext(sp.next, '/?view=missions'));
  if (sp.reason) params.set('reason', sp.reason);
  const q = params.toString();
  redirect(q ? `/join?${q}` : '/join');
}
