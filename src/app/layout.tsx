import type { Metadata, Viewport } from 'next';
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

const SITE_URL = 'https://beyond-earth-xi.vercel.app';
const SITE_NAME = 'Mission Control: Beyond Earth';
const DESCRIPTION =
  'Plan real space missions to the Moon, Mars, an asteroid and Earth orbit. Build your spacecraft, fly a realistic 3D launch, team up in squads of three and climb the leaderboard.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#03060f',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Space Mission Simulator`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['space mission simulator', 'space game', 'rocket launch simulation', 'mission control', 'Moon mission', 'Mars mission', 'asteroid mission', 'spacecraft builder', 'STEM education', 'multiplayer squads'],
  category: 'education',
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  // icon.png, apple-icon.png, favicon.ico and the social images come from files in src/app/
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Space Mission Simulator`,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Space Mission Simulator`,
    description: DESCRIPTION,
  },
  appleWebApp: { capable: true, title: 'Mission Control', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
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
