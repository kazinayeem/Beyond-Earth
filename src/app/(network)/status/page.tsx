import { DbNotReady } from '@/components/network/DbNotReady';

export const metadata = { title: 'System status', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function StatusPage() {
  return <DbNotReady />;
}
