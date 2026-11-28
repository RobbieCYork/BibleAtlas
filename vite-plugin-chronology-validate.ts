import { spawnSync } from 'node:child_process'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Runs `scripts/chronology-validate/run.mjs` at the start of every production build and fails the
 * build if any Chronology round could be unfair: a tied or disputed pair, a non-famous card on Easy,
 * a category that cannot deal a level. Wired in for the same reason as
 * vite-plugin-archaeology-validate.ts: a build is the only check that always runs.
 *
 * It bundles the data with rolldown and does not type-check; `tsc -b` does that.
 */
export function chronologyValidatePlugin(): Plugin {
  let root = process.cwd()
  return {
    name: 'chronology-validate',
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    buildStart() {
      const script = path.join(root, 'scripts/chronology-validate/run.mjs')
      const result = spawnSync(process.execPath, [script, '--quiet'], {
        cwd: root,
        stdio: ['ignore', 'inherit', 'inherit'],
      })
      if (result.error) {
        this.error(`chronology-validate could not run: ${result.error.message}`)
      }
      if (result.status !== 0) {
        this.error('chronology-validate failed: see the report above and fix src/data/chronologyPool.ts.')
      }
      this.info('chronology-validate ok')
    },
  }
}
