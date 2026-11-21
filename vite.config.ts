import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildIdPlugin } from './vite-plugin-build-id.ts'
import { seoPlugin } from './vite-plugin-seo.ts'
import { archaeologyValidatePlugin } from './vite-plugin-archaeology-validate.ts'
import { paidContentPlugin } from './vite-plugin-paid-content.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [paidContentPlugin(), react(), buildIdPlugin(), archaeologyValidatePlugin(), seoPlugin()],
  build: {
    rollupOptions: {
      // The app, plus the stand-alone unsubscribe page linked from Groups invite emails (sql/049):
      // no app code, no Supabase client, just a fetch to the group-invite-unsubscribe function.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        unsubscribe: fileURLToPath(new URL('./email/unsubscribe.html', import.meta.url)),
      },
    },
  },
})
