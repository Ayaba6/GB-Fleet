import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'GB-Fleet',            // Nom complet affiché sur mobile
        short_name: 'GB-Fleet',            // Nom court pour l’écran d’accueil
        description: 'Gestion de flotte',
        theme_color: '#0ea5e9',            // Couleur de la barre de statut
        background_color: '#ffffff',       // Couleur de fond au lancement
        display: 'standalone',             // Pour que l’app s’ouvre en mode standalone
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})
