import { readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://tian.ymse.land',
  // Pages build to admin.html rather than admin/index.html, so Cloudflare
  // serves them without a trailing slash
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    react(),
    // Every file of the page's code, for the service worker to keep
    // (public/sw.js), so each game opens without a network
    {
      name: 'precache',
      hooks: {
        'astro:build:done': ({ dir }) => {
          const out = fileURLToPath(dir)
          const files = readdirSync(`${out}_astro`)
            .filter((f) => /\.(js|css)$/.test(f))
            .sort()
            .map((f) => `/_astro/${f}`)
          writeFileSync(`${out}precache.json`, JSON.stringify(files))
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
