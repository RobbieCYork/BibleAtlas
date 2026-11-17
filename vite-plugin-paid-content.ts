import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Capstone Plus phase 1 (sql/043, src/lib/paidContentSpec.ts, scripts/paid-content/README.md).
 *
 * Two jobs:
 *
 *  1. Always: defines `__PAID_CONTENT_SOURCE__` ('bundle' | 'server') from paid-content.config.json
 *     (env PAID_CONTENT_SOURCE overrides it for one build), which src/lib/paidContent.ts reads.
 *
 *  2. Only in 'server' mode: replaces the five article data modules
 *     (src/data/{locations,pois,people,topics,timelineEvents}.ts) with their FREE emission, so the
 *     text below the cut is not in any JS file a browser can download. The files on disk are not
 *     touched — capstone-content keeps editing them, and the name-linker suite, the archaeology
 *     validator and the SEO generator keep reading the full records from them, so `npm run
 *     test:linker` still sees every word of paid text. Only what is SHIPPED changes.
 *
 * In 'bundle' mode (the default until sql/043 is applied and seeded) the data modules ship exactly
 * as today and the app cuts the paid body out locally, so nothing changes for anyone.
 *
 * The emission is computed by the same spec the seed is written from (scripts/paid-content/lib.mjs
 * bundles src/lib/paidContentSpec.ts with rolldown), so the bundle and the table cannot disagree
 * about where the line is.
 */
export function paidContentPlugin(): Plugin {
  let root = process.cwd()
  let source: 'bundle' | 'server' = 'bundle'
  let emitted: Map<string, string> | null = null

  const loadLib = async () => {
    const lib = pathToFileURL(path.join(root, 'scripts/paid-content/lib.mjs')).href
    return import(/* @vite-ignore */ lib)
  }

  return {
    name: 'paid-content',
    enforce: 'pre',
    async config(userConfig) {
      root = userConfig.root ? path.resolve(userConfig.root) : process.cwd()
      const { readPaidConfig } = await loadLib()
      source = readPaidConfig(root).appSource
      return { define: { __PAID_CONTENT_SOURCE__: JSON.stringify(source) } }
    },
    async buildStart() {
      if (source !== 'server') return
      const { DATASETS, loadDataAndSpec } = await loadLib()
      const data = await loadDataAndSpec(root)
      emitted = new Map()
      for (const d of DATASETS as { kind: string; exportName: string; file: string }[]) {
        const records = data[d.exportName] as unknown[]
        const free = records.map((r) => data.spec.freeEmission(d.kind, r))
        // JSON.parse of one string literal: smaller to ship and faster to parse than an object literal.
        const code = `export const ${d.exportName} = JSON.parse(${JSON.stringify(JSON.stringify(free))});\n`
        emitted.set(path.join(root, d.file), code)
      }
      this.info(`paid-content: server mode — ${emitted.size} data modules emitted free-only`)
    },
    load(id) {
      if (!emitted) return null
      return emitted.get(id.split('?')[0]) ?? null
    },
  }
}
