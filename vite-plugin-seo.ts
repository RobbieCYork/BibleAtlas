import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Pre-renders the public article site (one HTML document per record in `src/data/*.ts`) and the
 * sitemap into the build output, at the end of every production build.
 *
 * It is wired in here rather than left as a script someone remembers to run, because the sitemap
 * and the pages are only trustworthy if they cannot drift from the data. A record added to
 * `src/data/people.ts` gets a page and a sitemap entry on the next build; a record deleted loses
 * both. There is no list to maintain by hand and no step to forget.
 *
 * The generator itself lives in `scripts/seo/` as plain .mjs and is imported dynamically, for two
 * reasons: it is ~3 MB of data away from anything the dev server needs, so `closeBundle` is the
 * first moment it should be loaded, and it stays runnable on its own (`node scripts/seo/build-seo.mjs
 * dist`) while iterating on the templates without sitting through a full `vite build` each time.
 */
export function seoPlugin(): Plugin {
  let outDir = 'dist'
  let root = process.cwd()
  return {
    name: 'seo-prerender',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      // Resolved from Vite's own project root rather than this file's location: the config is
      // bundled to a temp module before it runs, so `import.meta.url` is not a path to trust here.
      const generator = pathToFileURL(path.join(root, 'scripts/seo/build-seo.mjs')).href
      const { generateSeo } = await import(/* @vite-ignore */ generator)
      const result = await generateSeo(outDir)
      this.info(
        `pre-rendered ${result.pages} public pages + sitemap.xml (${result.urls} urls) — ` +
          Object.entries(result.counts as Record<string, number>)
            .map(([k, v]) => `${k} ${v}`)
            .join(', '),
      )
    },
  }
}
