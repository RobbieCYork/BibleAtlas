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
 * rows — the two translations have 486 and 494 distinct keys between them — against the ~840KB two
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
