import { notFound } from 'next/navigation';
import { getPlayerDossier } from '@/lib/network/queries';
import { PlayerDossier } from '@/components/network/PlayerDossier';
import { InviteButton } from '@/components/network/InviteButton';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const playerCode = code.toUpperCase();
  if (!/^MC-[2-9A-HJ-NP-Z]{6}$/.test(playerCode)) return { title: 'Pilot not found' };
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('display_name, username').eq('player_code', playerCode).maybeSingle();
  if (!data) return { title: 'Pilot not found', robots: { index: false } };
  return {
    title: `${data.display_name} (${playerCode})`,
    description: `Pilot profile for ${data.display_name} (@${data.username}): rank, mission history, achievements and squad on Mission Control.`,
    alternates: { canonical: `/players/${playerCode}` },
  };
}

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
