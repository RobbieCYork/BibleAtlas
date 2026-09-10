import { spawnSync } from 'node:child_process'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Runs `scripts/archaeology-validate/run.mjs` at the start of every production build and FAILS the
 * build if it does not pass.
 *
 * It is wired in here, rather than left as a script someone remembers to run, for the same reason
 * `vite-plugin-seo.ts` is: this repo has no CI, so `vite build` is the only thing that runs
 * automatically on every push — Vercel runs it, and every agent is required to run it. A check that
 * only fires when a reviewer remembers it is not a check, and archaeology batch 3 proved that at
 * cost: it shipped five of fourteen articles with no institutional citation, which §3.2 makes
 * mandatory, and the count that found them was taken AFTER the deploy.
 *
 * `buildStart`, not `closeBundle`, so a batch with a data fault is told in the first second rather
 * than after a full bundle. The SEO generator has to run at the end because it writes into the
 * output directory; this one only reads `src/data`.
 *
 * Run as a child process on purpose: the validator's exit code is its result, and it must not be
 * able to take the Vite process down with it or have its `process.exit` swallowed.
 *
 * 🚨 This does NOT make the validator a build check, and does not make the build a data check.
 * The validator bundles the data with rolldown, which strips TypeScript types without checking
 * them — see AGENTS.md. `tsc -b` is what compiles. They are two different questions asked in one
 * command.
 */
export function archaeologyValidatePlugin(): Plugin {
  let root = process.cwd()
  return {
    name: 'archaeology-validate',
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    buildStart() {
      const script = path.join(root, 'scripts/archaeology-validate/run.mjs')
      const result = spawnSync(process.execPath, [script, '--quiet'], {
        cwd: root,
        stdio: ['ignore', 'inherit', 'inherit'],
      })
      if (result.error) {
        this.error(`archaeology-validate could not run: ${result.error.message}`)
      }
      if (result.status !== 0) {
        this.error(
          'archaeology-validate failed — see the report above. Fix the data, or, for a flag ' +
            'signal you have read and ruled on, record the verdict in ' +
            'scripts/archaeology-validate/reviewed.tsv. Rules: §3.2 and §4.1 of ' +
            'automation/manager/archaeology-scope.md.',
        )
      }
      this.info('archaeology-validate ok')
    },
  }
}
