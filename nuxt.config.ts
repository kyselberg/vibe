// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxthub/core', '@pinia/nuxt', '@vueuse/nuxt', '@vite-pwa/nuxt'],
  runtimeConfig: {
    appPasscode: process.env.NUXT_APP_PASSCODE || process.env.VIBE_PASSCODE || 'vibe-player',
    sessionSecret: process.env.NUXT_SESSION_SECRET || process.env.VIBE_SESSION_SECRET || 'change-me-before-production',
    r2AccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    r2Bucket: process.env.R2_BUCKET || '',
    r2Endpoint: process.env.R2_ENDPOINT || '',
    r2Region: process.env.R2_REGION || 'auto',
    public: {
      appName: 'Vibe Player',
      mediaMaxUploadMb: 250
    }
  },
  hub: {
    db: {
      dialect: 'sqlite',
      applyMigrationsDuringBuild: false
    },
    blob: true,
    dir: '.data'
  },
  nitro: {
    cloudflare: {
      nodeCompat: true
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Vibe Player',
      short_name: 'Vibe',
      description: 'Private music streaming lounge with cinematic backgrounds.',
      theme_color: '#0f1724',
      background_color: '#081018',
      display: 'standalone'
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,mp4}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
    },
    client: {
      installPrompt: true
    }
  }
})
