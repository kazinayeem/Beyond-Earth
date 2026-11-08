import { NetworkShell } from '@/components/network/NetworkShell';

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return <NetworkShell>{children}</NetworkShell>;
}
