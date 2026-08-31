import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildIdPlugin } from './vite-plugin-build-id.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildIdPlugin()],
})
