import Link from 'next/link';
import { AuthFrame } from '@/components/network/AuthFrame';
import { LoginForm } from '@/components/network/AuthForms';
import { isGoogleEnabled } from '@/lib/network/authSettings';
import { safeNext } from '@/lib/network/safeNext';

export const metadata = { title: 'Sign in · Mission Control' };

const BANNERS: Record<string, string> = {
  mission: 'Sign in to fly missions — results are verified and saved to your pilot record.',
  link_invalid: 'That link is invalid or has expired. Request a new one.',
  oauth_failed: 'Google sign-in did not complete. Try again or use email.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, '/profile');
  const banner = BANNERS[sp.reason ?? ''] ?? BANNERS[sp.error ?? ''] ?? null;
  return (
    <AuthFrame eyebrow="Pilot authentication" title="Welcome back, pilot" subtitle="Sign in to resume your missions and squad operations."
      footer={<>New to Mission Control? <Link href="/register" className="text-cyan-300 hover:text-cyan-100">Create an account</Link></>}>
      <LoginForm next={next} googleEnabled={await isGoogleEnabled()} banner={banner} />
    </AuthFrame>
  );
}
