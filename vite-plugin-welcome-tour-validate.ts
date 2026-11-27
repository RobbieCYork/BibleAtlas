import { spawnSync } from 'node:child_process'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Runs `scripts/welcome-tour-validate/run.mjs` at the start of every production build and fails the
 * build if the welcome tour points at something the app no longer has. Wired in for the same reason
 * as vite-plugin-archaeology-validate.ts: a build is the only check that always runs.
 */
export function welcomeTourValidatePlugin(): Plugin {
  let root = process.cwd()
  return {
    name: 'welcome-tour-validate',
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    buildStart() {
      const script = path.join(root, 'scripts/welcome-tour-validate/run.mjs')
      const result = spawnSync(process.execPath, [script, '--quiet'], {
        cwd: root,
        stdio: ['ignore', 'inherit', 'inherit'],
      })
      if (result.error) {
        this.error(`welcome-tour-validate could not run: ${result.error.message}`)
      }
      if (result.status !== 0) {
        this.error('welcome-tour-validate failed: see the report above and update src/data/welcomeTour.ts.')
      }
      this.info('welcome-tour-validate ok')
    },
  }
}
