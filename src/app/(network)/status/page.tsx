import { DbNotReady } from '@/components/network/DbNotReady';

export const metadata = { title: 'System status · Mission Control' };
export const dynamic = 'force-dynamic';

export default function StatusPage() {
  return <DbNotReady />;
}
