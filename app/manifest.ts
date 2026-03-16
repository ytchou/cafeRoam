import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '啡遊 CafeRoam',
    short_name: '啡遊',
    description:
      "Discover Taiwan's best independent coffee shops with AI-powered semantic search.",
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6F4E37',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
