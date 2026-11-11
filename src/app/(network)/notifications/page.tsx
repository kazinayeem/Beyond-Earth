import { redirect } from 'next/navigation';
import { getNotifications, getSquadDashboard } from '@/lib/network/queries';
import { NotificationsList } from '@/components/network/NotificationsList';
import { PageHeader } from '@/components/network/ui';

export const metadata = { title: 'Notifications', robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const squad = await getSquadDashboard();
  if (!squad) redirect('/login?next=/notifications');
  const items = await getNotifications();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <PageHeader eyebrow="Comms" title="Notifications" />
      <NotificationsList items={items} pendingInviteIds={squad.receivedInvites.map(i => i.id)} />
    </div>
  );
}
