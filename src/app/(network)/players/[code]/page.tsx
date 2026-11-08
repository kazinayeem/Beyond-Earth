import { notFound } from 'next/navigation';
import { getPlayerDossier } from '@/lib/network/queries';
import { PlayerDossier } from '@/components/network/PlayerDossier';
import { InviteButton } from '@/components/network/InviteButton';

export default async function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^MC-[2-9A-HJ-NP-Z]{6}$/i.test(code)) notFound();
  const d = await getPlayerDossier({ code });
  if (!d) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <PlayerDossier d={d} editor={d.viewerId && !d.isMe ? <InviteButton playerId={d.profile.id} name={d.profile.display_name} /> : null} />
    </div>
  );
}
