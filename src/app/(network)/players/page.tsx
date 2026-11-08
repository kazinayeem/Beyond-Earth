import { getMe } from '@/lib/network/queries';
import { PageHeader } from '@/components/network/ui';
import { PlayerSearch } from '@/components/network/PlayerSearch';

export const metadata = { title: 'Find players · Mission Control' };

export default async function PlayersPage() {
  const me = await getMe();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <PageHeader eyebrow="Pilot directory" title="Find players" />
      <PlayerSearch inSquad={Boolean(me?.group)} signedIn={Boolean(me)} />
    </div>
  );
}
