import { AuthFrame } from '@/components/network/AuthFrame';
import { JoinForm } from '@/components/network/AuthForms';
import { safeNext } from '@/lib/network/safeNext';

export const metadata = { title: 'Join game', description: 'Pick a unique username to fly missions solo or with a squad. No email or password needed.' };

const BANNERS: Record<string, string> = {
  mission: 'Pick a username to fly missions: results are verified and saved under your name.',
  squad: 'Pick a username to create or join a squad.',
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, '/?view=missions');
  return (
    <AuthFrame eyebrow="Join the game" title="Choose your pilot name" subtitle="Create a new username, or come back with the one you already have.">
      <JoinForm next={next} banner={BANNERS[sp.reason ?? ''] ?? null} />
    </AuthFrame>
  );
}
