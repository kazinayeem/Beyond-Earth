import { redirect } from 'next/navigation';
import { getPlayerDossier, getVerifiedUserIdSafe } from '@/lib/network/serverAuth';
import { ensureMyProfile } from '@/lib/network/queries';
import { PlayerDossier } from '@/components/network/PlayerDossier';
import { ProfileEditor } from '@/components/network/ProfileEditor';
import { Notice } from '@/components/network/ui';
import { DbNotReady } from '@/components/network/DbNotReady';

export const metadata = { title: 'My profile · Mission Control' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await getVerifiedUserIdSafe();
  if (!uid) redirect('/login?next=/profile');
  const sp = await searchParams;
  let d = await getPlayerDossier({ id: uid });
  if (!d && (await ensureMyProfile())) d = await getPlayerDossier({ id: uid }); // repair a missing profile once
  if (!d) return <DbNotReady />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-4">
      {sp.welcome && <Notice tone="ok">Welcome aboard, {d.profile.display_name}. Your permanent player ID is {d.profile.player_code}.</Notice>}
      {sp.password && <Notice tone="ok">Password updated.</Notice>}
      <PlayerDossier d={d} editor={<ProfileEditor profile={d.profile} />} />
    </div>
  );
}
