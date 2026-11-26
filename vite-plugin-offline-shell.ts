import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Writes /sw.js, the service worker that lets the app open with no connection. The logic is in
 * scripts/offline-shell/sw.template.js; this fills in what must be saved for this build.
 *
 * KILL SWITCH. If the worker ever misbehaves in production, build with `DISABLE_OFFLINE_SHELL=1` and
 * deploy: /sw.js then becomes a worker whose only job is to delete its caches and unregister itself.
 * Downloaded Bible texts are stored separately and are not touched.
 */

/** The photo-to-text engine is several megabytes and nothing to do with reading offline. */
const NOT_PRECACHED = /tesseract|worker\.min/

const KILL_WORKER = `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((k) => k.startsWith("cb-")).map((k) => caches.delete(k)));
    await self.registration.unregister();
  })());
});
`

export function offlineShellPlugin(): Plugin {
  return {
    name: 'offline-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      if (process.env.DISABLE_OFFLINE_SHELL) {
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: KILL_WORKER })
        return
      }
      const assets = Object.keys(bundle)
        .filter((f) => f.startsWith('assets/') && /\.(js|css)$/.test(f) && !NOT_PRECACHED.test(f))
        .map((f) => `/${f}`)
      const html = bundle['index.html']
      if (!html || html.type !== 'asset') this.error('offline-shell: index.html is not in the bundle')
      const source = String(html.source)
      const entry = assets.filter((a) => source.includes(a))
      if (!entry.some((a) => a.endsWith('.js'))) this.error('offline-shell: index.html names no script to save')

      const fontCss = readFileSync(resolve('public/fonts/base.css'), 'utf8')
      const fonts = [...fontCss.matchAll(/url\((\/fonts\/[^)]+)\)/g)].map((m) => m[1])
      const precache = [...assets, '/fonts/base.css', ...new Set(fonts), '/manifest.webmanifest', '/favicon.ico', '/favicon.svg', '/icon-192.png']

      const worker = readFileSync(resolve('scripts/offline-shell/sw.template.js'), 'utf8')
        .replace('__BUILD__', JSON.stringify(Date.now()))
        .replace('__PRECACHE__', JSON.stringify(precache))
        .replace('__ENTRY__', JSON.stringify(entry))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker })
    },
  }
}
