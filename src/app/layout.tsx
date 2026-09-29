import type { Metadata } from 'next';
import { Inter, Space_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const spaceMono = Space_Mono({
  variable: '--font-mono',
  weight: ['400', '700'],
  subsets: ['latin'],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
    <html lang="en" className={`${inter.variable} ${spaceMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#020617] text-slate-100 overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
