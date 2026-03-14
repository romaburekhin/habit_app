import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Habit Tracker',
    short_name: 'Habits',
    description: 'Track your daily habits',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#111827',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
