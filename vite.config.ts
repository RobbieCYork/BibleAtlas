import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildIdPlugin } from './vite-plugin-build-id.ts'
import { seoPlugin } from './vite-plugin-seo.ts'
import { archaeologyValidatePlugin } from './vite-plugin-archaeology-validate.ts'
import { paidContentPlugin } from './vite-plugin-paid-content.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [paidContentPlugin(), react(), buildIdPlugin(), archaeologyValidatePlugin(), seoPlugin()],
})
