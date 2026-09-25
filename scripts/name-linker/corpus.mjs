// The corpora the harness measures over.
//
// 1. Scripture — in ALL THREE translations `BiblePanel` offers, committed gzipped under corpus/:
//    the World English Bible (31,098 verses, the default), the King James Version (31,207) and the
//    American Standard Version (31,085). See corpus/PROVENANCE.md.
// 2. Prose — every authored block in src/data that the app passes through the linker via
//    LinkedVerseText. Enumerated live from the data files, so new writing is measured automatically.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadLinker, stripMarkup } from "./loadLinker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The translations a reader can actually select, in the order the panel lists them. WEB is the
 * default and the only one the row-level `bible-links.tsv` snapshot covers; the other two are
 * covered by `translation-divergence.tsv` and by their own `key-totals.tsv` paths. */
export const TRANSLATIONS = ["WEB", "KJV", "ASV"];

const CORPUS_FILE = { WEB: "web-bible.json.gz", KJV: "kjv-bible.json.gz", ASV: "asv-bible.json.gz" };

export function loadBible(translation = "WEB") {
  const file = CORPUS_FILE[translation];
  if (!file) throw new Error(`No corpus for translation ${translation}`);
  const gz = fs.readFileSync(path.join(HERE, "corpus", file));
  return JSON.parse(zlib.gunzipSync(gz).toString("utf8"));
}

/** `{ WEB: [...], KJV: [...], ASV: [...] }`. */
export function loadAllTranslations() {
  return Object.fromEntries(TRANSLATIONS.map((t) => [t, loadBible(t)]));
}

/** Every authored prose block, with the `excludeId` the owning panel passes. Mirrors what
 * PersonPanel / LocationPanel / PoiPanel / TopicPanel / BookIntroView / TimelineEventPanel
 * actually render.
 *
 * If you add a component that puts authored text through `LinkedVerseText`, add its source fields
 * here in the same commit. Until 2026-09-04 this function omitted `timelineEvents` entirely, and
 * the 358 timeline articles — the single largest authored surface in the app — were invisible to
 * the whole net: a batch could move thousands of links inside them and every snapshot stayed
 * green. Nothing outside this file caught that, and nothing outside this file can. */
export async function loadProseBlocks() {
  const { locations, pois, people, topics, bookIntros, timelineEvents, bookIntroOwnerId } = await loadLinker();
  const blocks = [];
  const add = (src, owner, text) => {
    if (typeof text === "string" && text.trim()) blocks.push({ src, owner, text });
  };

  people.forEach((p) => {
    (p.lifeStory ?? []).forEach((x) => add("person.lifeStory", p.id, x));
    add("person.placesLived", p.id, p.placesLived);
    (p.controversies ?? []).forEach((x) => add("person.controversies", p.id, x));
    add("person.lifespanDatingNotes", p.id, p.lifespanDatingNotes);
    (p.extraBiblicalReferences ?? []).forEach((r) => {
      add("person.extraBib.source", p.id, r.source);
      add("person.extraBib.summary", p.id, r.summary);
    });
  });
  locations.forEach((l) => {
    const h = l.history ?? {};
    add("location.history.founded", l.id, h.founded);
    add("location.history.population", l.id, h.population);
    add("location.history.industry", l.id, h.industry);
    // The field is `notableFacts` — that is what `LocationHistory` declares in src/data/types.ts
    // and what LocationPanel maps over, each entry through its own LinkedVerseText. This line read
    // `h.facts`, a name no record has ever carried, so it silently enumerated NOTHING: 385 blocks
    // across all 117 location records, carrying 852 links of which 321 are person links, were
    // outside the net from the day it was written. Same shape as the timelineEvents omission the
    // README describes, and found the same way — by a batch editing four location records and
    // noticing its own cross-links never reached the snapshot.
    //
    // `facts` is kept as a fallback rather than deleted, because reading a field that does not
    // exist is the bug and hard-coding a single name is how it happened.
    (h.notableFacts ?? h.facts ?? []).forEach((x) => add("location.history.facts", l.id, x));
    if (l.archaeology?.note) add("location.archaeology.note", l.id, l.archaeology.note);
  });
  pois.forEach((p) => {
    add("poi.description", p.id, p.description);
    if (p.archaeology?.note) add("poi.archaeology.note", p.id, p.archaeology.note);
  });
  topics.forEach((t) => {
    (t.sections ?? []).forEach((s) => (s.paragraphs ?? []).forEach((x) => add("topic.section", t.id, x)));
  });
  // TimelineEventPanel splits `article` on blank lines and renders each paragraph through its own
  // LinkedVerseText, so the harness must split it the same way: annotation offsets are per-block,
  // and a whole-article block would report offsets no rendered element ever has.
  timelineEvents.forEach((e) => {
    e.article
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => add("timelineEvent.article", e.id, p));
    add("timelineEvent.datingNotes", e.id, e.datingNotes);
  });
  // BookIntroView passes `bookIntroOwnerId(book)` as its excludeId — the synthesised owner a book
  // intro has in place of a record id. The harness imports that function from the shipped module
  // rather than re-deriving the string, so the two cannot drift: if the id's shape ever changes,
  // both sides change together and the snapshot diff says so.
  bookIntros.forEach((i) => {
    const owner = bookIntroOwnerId(i.book);
    add("bookIntro.whyWritten", owner, i.whyWritten);
    (i.summary ?? []).forEach((x) => add("bookIntro.summary", owner, x));
    (i.manuscripts ?? []).forEach((x) => add("bookIntro.manuscripts", owner, x));
  });
  return blocks;
}

/** One TSV row per person-link, for both rendering paths.
 *  reader = what VerseText.tsx renders (book + chapter + verse passed).
 *  panel  = what LinkedVerseText.tsx renders (no context passed at all).
 *  A dash means that path produced no link there. */
export async function snapshotBible(verses) {
  const { computeLinkAnnotations } = await loadLinker();
  const rows = [];
  for (const v of verses) {
    const text = stripMarkup(v.text);
    const reader = computeLinkAnnotations(text, undefined, v.book, v.chapter, v.verse);
    const panel = computeLinkAnnotations(text);
    const spans = new Map();
    for (const a of reader) spans.set(`${a.start}:${a.end}`, {});
    for (const a of panel) if (!spans.has(`${a.start}:${a.end}`)) spans.set(`${a.start}:${a.end}`, {});
    for (const key of [...spans.keys()].sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]))) {
      const [s, e] = key.split(":").map(Number);
      const r = reader.find((a) => a.start === s && a.end === e);
      const p = panel.find((a) => a.start === s && a.end === e);
      if (r?.kind !== "person" && p?.kind !== "person") continue;
      rows.push([
        `${v.book} ${v.chapter}:${v.verse}`,
        s,
        text.slice(s, e),
        r?.id ?? "-",
        p?.id ?? "-",
      ].join("\t"));
    }
  }
  return rows;
}

/** The prose surface that exists ONLY on the pre-rendered public pages.
 *
 * `scripts/seo/render.mjs` puts these fields through the same `computeLinkAnnotations` the app
 * uses, to generate the ~1,000 pages at www.capstonebible.com. The APP renders every one of them as
 * plain text — `PersonPanel` prints `person.summary` in a `<p>`, `LocationPanel` prints a ruler's
 * name in a bare `<li>` — so `loadProseBlocks()` above correctly does not enumerate them, and until
 * 2026-09-10 nothing in this directory snapshotted a single one. They are live links that an
 * anonymous reader and a crawler both see, on the one surface of this app that needs no login.
 *
 * THE LIST IS DERIVED FROM `render.mjs`'s `ctx.linkify(...)` CALL SITES AND NOTHING CHECKS IT.
 * Same hazard as `loadProseBlocks()`, and it has already bitten once here: `modern-names.mjs` kept
 * its own copy of this function and read `l.rulers`, a field no location record has ever had — the
 * type is `LocationHistory.rulers` and render.mjs reads `loc.history?.rulers`. So the ruler branch
 * enumerated NOTHING, silently, from the day it was written: 86 blocks carrying 26 person links,
 * outside the modern-name sweep and outside every snapshot. Exactly the `h.facts` bug the comment
 * in `loadProseBlocks()` describes, in a second copy of the same list. That is why there is now one
 * copy, here, and `modern-names.mjs` imports it.
 *
 * If you add or remove a `ctx.linkify(...)` call in `render.mjs`, change this function in the same
 * commit — and if you rename a data field, grep this file for the old name. */
export async function loadSeoOnlyBlocks() {
  const { locations, people, topics, timelineEvents } = await loadLinker();
  const blocks = [];
  const add = (src, owner, text) => {
    if (typeof text === "string" && text.trim()) blocks.push({ src, owner, text });
  };
  // render.mjs: `<p class="lead">${ctx.linkify(person.summary, person.id)}</p>` and the
  // "Occupation" row of the definition list beneath it.
  people.forEach((p) => {
    add("seo:person.summary", p.id, p.summary);
    add("seo:person.occupation", p.id, p.occupation);
  });
  topics.forEach((t) => add("seo:topic.summary", t.id, t.summary));
  timelineEvents.forEach((e) => add("seo:timelineEvent.summary", e.id, e.summary));
  // `loc.history.rulers`, NOT `loc.rulers`. See the warning above.
  locations.forEach((l) => (l.history?.rulers ?? []).forEach((r) => add("seo:location.ruler.name", l.id, r.name)));
  return blocks;
}

/** What `makeLinkifier` in `scripts/seo/render.mjs` actually emits, for a block of public-page
 * prose: the annotations minus the ones that never become an `<a>`. Kept in step with that function
 * on purpose — a snapshot of raw annotations would record links the page does not print.
 *
 *   - `verse` annotations and any annotation with no id are dropped (no page of their own).
 *   - an annotation pointing at a record this build does not emit a page for is dropped.
 *   - where two annotations overlap, the first one wins and the second is dropped.
 *
 * `emittedIds` is the set of ids that HAVE a page, per kind — the same `idsByLinkKind` map
 * `build-seo.mjs` builds from `KINDS`. All five kinds currently emit a page for every record, so
 * the second rule drops nothing today; it is here because the day a kind stops emitting one, the
 * snapshot must move with the pages rather than with the linker. */
export function seoEmittedLinks(anns, emittedIds) {
  const keep = [];
  let last = -1;
  for (const a of [...anns].sort((x, y) => x.start - y.start || y.end - x.end)) {
    if (a.kind === "verse" || !a.id) continue;
    if (emittedIds && !(emittedIds.get(a.kind)?.has(a.id) ?? true)) continue;
    if (a.start < last) continue;
    keep.push(a);
    last = a.end;
  }
  return keep;
}

/** The ids that have a public page, per link kind — `build-seo.mjs`'s `idsByLinkKind`, rebuilt
 * from the same data. The kind names are the `linkKind` values in `scripts/seo/site.mjs`; a new
 * public record type means a new entry there AND here. */
export async function seoEmittedIds() {
  const { locations, pois, people, topics, timelineEvents } = await loadLinker();
  return new Map([
    ["location", new Set(locations.map((r) => r.id))],
    ["poi", new Set(pois.map((r) => r.id))],
    ["person", new Set(people.map((r) => r.id))],
    ["topic", new Set(topics.map((r) => r.id))],
    ["timeline", new Set(timelineEvents.map((r) => r.id))],
  ]);
}

/** One row per link the public pages actually print on the SEO-only surface.
 *
 * WHY THIS FILE HAS A SHAPE OF ITS OWN, and is not three lines added to an existing one:
 *
 * 1. **Row level, not a key tally.** A row names the record and the field — `seo:person.summary`,
 *    `nero-caesar` — so a diff says which article moved. `key-totals.tsv`'s key is (kind, surface,
 *    id, path), which would tell you that some "Caesar" somewhere stopped pointing at Tiberius and
 *    not which of the 242 person summaries it was on. On a surface whose whole problem is that
 *    nobody can see it, "which page" is the entire value.
 *
 * 2. **Every kind, not people only.** `prose-links.tsv` records person links alone because
 *    `key-totals.tsv` covers the other kinds for that surface. Nothing covers any kind here, so
 *    splitting this into a person file plus a key-totals path would be two files where one does.
 *    The cost is 937 extra rows and it buys the location, topic, POI and timeline links on the
 *    public pages, which include the ruler names — a surface that is, by construction, mostly
 *    locations.
 *
 * 3. **Keyed by field + record + index, NOT by a hash of the text.** `prose-links.tsv` hashes each
 *    block, so editing a paragraph re-keys every row in it and any assertion about them vanishes
 *    with the old hash instead of failing (the README says so, and it is that file's known
 *    weakness). That trade is right for an article of many paragraphs, where a stable position does
 *    not exist. It is wrong here: these blocks are ONE per record per field — `person.summary` has
 *    exactly one block per person — or a short indexed list. So the position is stable, and keying
 *    on it means a reworded summary shows up as a CHANGED LINK ROW rather than as a silent re-key.
 *
 * 4. **A snapshot, not a reviewed ledger.** `self-name.mjs` refuses `--update` because its
 *    candidates are standing faults a plain baseline would bless forever, and there were fourteen
 *    of them. This surface is 1,753 links, most of which are correct, so a hand-written verdict per
 *    row is not a thing anyone would maintain — the same reason `modern-names.mjs` has `--update`
 *    and `self-name.mjs` does not. The standing-fault half of the job is already done by the sweep
 *    in `modern-names.mjs`, which reads these blocks; this is the "did anything move?" half, which
 *    nothing did. The baseline is only honest if somebody reads it once before committing it, and
 *    the commit that adds this file is that reading. */
export async function snapshotSeoOnly(blocks, emittedIds) {
  const { computeLinkAnnotations } = await loadLinker();
  emittedIds = emittedIds ?? (await seoEmittedIds());
  const seen = new Map();
  const rows = [];
  for (const b of blocks) {
    const idx = seen.get(`${b.src}|${b.owner}`) ?? 0;
    seen.set(`${b.src}|${b.owner}`, idx + 1);
    let anns;
    try {
      anns = computeLinkAnnotations(b.text, b.owner);
    } catch {
      continue; // render.mjs escapes the text and prints it unlinked; no links to record
    }
    for (const a of seoEmittedLinks(anns, emittedIds)) {
      rows.push([b.src, b.owner ?? "-", idx, a.start, a.text, a.kind, a.id].join("\t"));
    }
  }
  return rows.sort((x, y) => {
    const a = x.split("\t"), b = y.split("\t");
    return (
      a[0].localeCompare(b[0]) ||
      a[1].localeCompare(b[1]) ||
      Number(a[2]) - Number(b[2]) ||
      Number(a[3]) - Number(b[3]) ||
      x.localeCompare(y)
    );
  });
}

/** Prose rows are keyed by a hash of the block's own text, not by its position, so adding a
 * paragraph anywhere in src/data does not shift every row below it and turn the snapshot diff
 * into noise. Rows are sorted for the same reason. */
const blockKey = (b) =>
  `${b.src}|${b.owner ?? "-"}|${createHash("sha1").update(b.text).digest("hex").slice(0, 10)}`;

/** A compact, whole-corpus tally covering EVERY annotation kind, not just people: one row per
 * (kind, matched surface, resolved id, path) with a count.
 *
 * The row-level snapshots above only record person-links, because that is where the ambiguity is.
 * But a change to `people.ts` can steal a key from a location, and adding a POI alternate name can
 * start firing hundreds of new links — neither of which the person snapshots would show at all.
 * This file is small enough to keep forever and catches both.
 *
 * The KJV and ASV reader paths are tallied here too, as `reader:kjv` and `reader:asv`. That is what
 * makes this file the regression NET for the other two translations rather than only the default
 * one: the key carries the matched surface as well as the kind and the id, so a KJV link that
 * vanishes, repoints, or merely grows to cover a longer phrase moves a row here. It costs about 980
 * rows — the two translations have 488 and 494 distinct keys between them — against the ~840KB two
 * more `bible-links.tsv` files would have cost for person links alone. Neither extra translation
 * gets a `panel` path: `LinkedVerseText` never renders a Bible verse, the panel column over
 * Scripture exists to measure the gap between the two code paths, and that measurement is already
 * made in full on WEB. */
export async function snapshotKeyTotals(verses, blocks, extraTranslations = {}) {
  const { computeLinkAnnotations } = await loadLinker();
  const tally = new Map();
  const bump = (path, a) => {
    const k = `${a.kind}\t${a.text.toLowerCase()}\t${a.id ?? "-"}\t${path}`;
    tally.set(k, (tally.get(k) ?? 0) + 1);
  };
  for (const v of verses) {
    const text = stripMarkup(v.text);
    for (const a of computeLinkAnnotations(text, undefined, v.book, v.chapter, v.verse)) bump("reader", a);
    for (const a of computeLinkAnnotations(text)) bump("panel", a);
  }
  for (const [translation, rows] of Object.entries(extraTranslations)) {
    const path = `reader:${translation.toLowerCase()}`;
    for (const v of rows) {
      const text = stripMarkup(v.text);
      for (const a of computeLinkAnnotations(text, undefined, v.book, v.chapter, v.verse)) bump(path, a);
    }
  }
  for (const b of blocks) for (const a of computeLinkAnnotations(b.text, b.owner)) bump("prose", a);
  return [...tally.entries()].map(([k, n]) => `${k}\t${n}`).sort();
}

/** Where the three translations do NOT produce the same links — one row per
 * (verse, kind, resolved id) whose link COUNT is not identical in all three, carrying the surface
 * each translation matched.
 *
 * Why this file exists, and why it is not two more copies of `bible-links.tsv`:
 *
 * 1. **The fault that prompted it was a location.** "Judaea" was not a registered name, so KJV and
 *    ASV readers lost 85 Judea links in Scripture while WEB readers kept them. `bible-links.tsv`
 *    records ONLY person links. Two more files of the same shape would not have shown a single one
 *    of those 85.
 * 2. **The fault never moved.** It had been there since the records were written, so a
 *    per-translation snapshot would have baselined it as correct and stayed green forever. A file
 *    whose subject is *disagreement between translations* makes a standing fault visible on the day
 *    it is first written, which is the same argument `self-name.mjs` is built on.
 * 3. **It is small enough to read.** Keyed by resolved id rather than by surface, so "the angel"
 *    against "angel" — same record, both linked, one span a word longer — is not a divergence and
 *    does not appear. Keying on the surface instead more than doubles the file with that noise.
 *
 * A count rather than a boolean, because "David is linked twice in WEB and once in the KJV" is a
 * real difference and usually an honest one (the KJV writes a pronoun where the WEB repeats the
 * name). `n/a` means the verse is not in that translation's corpus at all — the KJV carries 109
 * verses the WEB critical text does not, and the ASV is 13 short of the WEB.
 *
 * What it cannot see: a link whose SPAN changes in one translation only, while the kind, the id and
 * the count all stay equal across the three. That shape produces no row here — `key-totals.tsv`'s
 * `reader:kjv` / `reader:asv` paths are what cover it, and they are the reason this file does not
 * have to. */
export async function snapshotTranslationDivergence(corpora) {
  const { computeLinkAnnotations } = await loadLinker();
  const UNIT = String.fromCharCode(31);
  const names = Object.keys(corpora);
  const per = new Map();      // ref -> { translation -> Map(kind\x1fid -> count) }
  const surfaces = new Map(); // ref\x1fkey\x1ftranslation -> Set(surface)
  for (const t of names) {
    for (const v of corpora[t]) {
      const ref = `${v.book} ${v.chapter}:${v.verse}`;
      const text = stripMarkup(v.text);
      const counts = new Map();
      for (const a of computeLinkAnnotations(text, undefined, v.book, v.chapter, v.verse)) {
        const k = `${a.kind}${UNIT}${a.id ?? "-"}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
        const sk = `${ref}${UNIT}${k}${UNIT}${t}`;
        if (!surfaces.has(sk)) surfaces.set(sk, new Set());
        surfaces.get(sk).add(a.text);
      }
      if (!per.has(ref)) per.set(ref, {});
      per.get(ref)[t] = counts;
    }
  }
  const rows = [];
  for (const [ref, m] of per) {
    const keys = new Set(names.flatMap((t) => [...(m[t] ?? new Map()).keys()]));
    for (const k of keys) {
      const counts = names.map((t) => (t in m ? (m[t].get(k) ?? 0) : -1));
      if (counts.every((c) => c === counts[0])) continue;
      const [kind, id] = k.split(UNIT);
      const cells = names.map((t, i) => {
        if (counts[i] < 0) return `${t}=n/a`;
        if (counts[i] === 0) return `${t}=0`;
        const s = [...(surfaces.get(`${ref}${UNIT}${k}${UNIT}${t}`) ?? [])].sort().join("|");
        return `${t}=${counts[i]}:${s}`;
      });
      rows.push([ref, kind, id, ...cells].join("\t"));
    }
  }
  return rows.sort();
}

export async function snapshotProse(blocks) {
  const { computeLinkAnnotations } = await loadLinker();
  const rows = [];
  for (const b of blocks) {
    for (const a of computeLinkAnnotations(b.text, b.owner)) {
      if (a.kind !== "person") continue;
      rows.push([blockKey(b), a.start, a.text, a.id].join("\t"));
    }
  }
  return rows.sort();
}
