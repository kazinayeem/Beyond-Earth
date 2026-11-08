import type { Metadata } from 'next';
import { Inter, Roboto_Mono, Exo_2 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/network/AuthProvider';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
});

const exo = Exo_2({
  variable: '--font-exo',
  subsets: ['latin'],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#03060f',
};

export const metadata: Metadata = {
  title: 'Mission Control: Beyond Earth | NASA Space Mission Strategy & Simulation',
  description: 'Design, launch, manage, and complete realistic space exploration missions. Balance mass, power, budget, risk, and unexpected deep-space anomalies.',
  keywords: ['NASA', 'space exploration', 'simulation game', 'mission control', 'aerospace engineering', 'lunar explorer'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable} ${exo.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#020617] text-slate-100 overflow-x-hidden font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
