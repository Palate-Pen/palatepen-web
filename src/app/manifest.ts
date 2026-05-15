import type { MetadataRoute } from 'next';

/**
 * PWA manifest. Mostly to give installable browsers the right icons
 * + brand colours. Theme/background pulled from the v8 design tokens.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Palatable',
    short_name: 'Palatable',
    description: 'Back office work you can stomach.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F4ED',
    theme_color: '#1A1612',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
