import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Ships the downloadable Bible texts ("packs") with the build.
 *
 * Packs live in `bible-packs/` (made by scripts/bible-packs/build.mjs): `catalog.json` plus one JSON
 * file per book at `<translation>/<nn>.json`. This plugin
 *   - checks every file against the size and SHA-256 the catalog records, and FAILS THE BUILD on any
 *     difference, so an edited or truncated Bible text cannot ship;
 *   - injects the catalog into the app as `__BIBLE_CATALOG__`;
 *   - emits the files to `/bibles/<translation>/<version>/<nn>.json`. The version is in the path, so
 *     the files can be cached for ever and a half-finished download can never mix two texts.
 *
 * With an empty catalog the app behaves as it did before offline reading existed.
 * `BIBLE_PACKS_DIR` points a test build at fixture packs; fixtures are refused on Vercel.
 */

interface Book { n: number; bytes: number; sha256: string; verses: number }
interface Pack { id: string; version: string; bytes: number; verses: number; fixture?: boolean; books: Book[] }

const fileName = (n: number) => `${String(n).padStart(2, '0')}.json`

export function biblePacksPlugin(): Plugin {
  const dir = resolve(process.env.BIBLE_PACKS_DIR || 'bible-packs')
  const files = new Map<string, Buffer>() // published path -> bytes

  function load(): { schema: 1; packs: Pack[] } {
    const catalogPath = join(dir, 'catalog.json')
    if (!existsSync(catalogPath)) return { schema: 1, packs: [] }
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { schema: number; packs: Pack[] }
    if (catalog.schema !== 1) throw new Error(`bible-packs: unknown catalog schema ${catalog.schema}`)
    files.clear()
    for (const pack of catalog.packs) {
      if (pack.fixture && process.env.VERCEL) throw new Error(`bible-packs: ${pack.id} is a test fixture and must never be deployed`)
      if (pack.books.length !== 66) throw new Error(`bible-packs: ${pack.id} lists ${pack.books.length} books, expected 66`)
      for (const book of pack.books) {
        const bytes = readFileSync(join(dir, pack.id, fileName(book.n)))
        const sha = createHash('sha256').update(bytes).digest('hex')
        if (bytes.length !== book.bytes || sha !== book.sha256) {
          throw new Error(`bible-packs: ${pack.id}/${fileName(book.n)} does not match the catalog. Rebuild the pack; never edit these files.`)
        }
        files.set(`bibles/${pack.id}/${pack.version}/${fileName(book.n)}`, bytes)
      }
    }
    return {
      schema: 1,
      packs: catalog.packs.map(({ id, version, bytes, verses, fixture, books }) => ({ id, version, bytes, verses, fixture, books })),
    }
  }

  return {
    name: 'bible-packs',
    config() {
      return { define: { __BIBLE_CATALOG__: JSON.stringify(load()) } }
    },
    generateBundle() {
      for (const [path, source] of files) this.emitFile({ type: 'asset', fileName: path, source })
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const bytes = files.get((req.url ?? '').split('?')[0].replace(/^\//, ''))
        if (!bytes) return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(bytes)
      })
    },
  }
}
