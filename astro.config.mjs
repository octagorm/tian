import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://tian.ymse.land',
  // Pages build to admin.html rather than admin/index.html, so Cloudflare
  // serves them without a trailing slash
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
})
