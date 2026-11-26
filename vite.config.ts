import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildIdPlugin } from './vite-plugin-build-id.ts'
import { seoPlugin } from './vite-plugin-seo.ts'
import { archaeologyValidatePlugin } from './vite-plugin-archaeology-validate.ts'
import { biblePacksPlugin } from './vite-plugin-bible-packs.ts'
import { offlineShellPlugin } from './vite-plugin-offline-shell.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildIdPlugin(), archaeologyValidatePlugin(), biblePacksPlugin(), offlineShellPlugin(), seoPlugin()],
})
