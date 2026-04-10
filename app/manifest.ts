import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BKTK International Portal',
    short_name: 'BKTK',
    description: 'Portail B2B de logistique, livraison et gestion des stocks pour BKTK International.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffffff',
    theme_color: '#ffffffff',
    icons: [
      {
        src: '/logo.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}
