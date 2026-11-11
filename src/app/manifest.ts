import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mission Control: Beyond Earth',
    short_name: 'Mission Control',
    description: 'Plan, build and fly space missions to the Moon, Mars, an asteroid and Earth orbit.',
    start_url: '/',
    display: 'standalone',
    background_color: '#02040b',
    theme_color: '#03060f',
    categories: ['education', 'games'],
    icons: [
      { src: '/brand/mark-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/mark-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
