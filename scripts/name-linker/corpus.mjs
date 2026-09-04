// The two corpora the harness measures over.
//
// 1. Scripture — the complete World English Bible, 31,098 verses, committed gzipped at
//    corpus/web-bible.json.gz. See corpus/PROVENANCE.md.
// 2. Prose — every authored block in src/data that the app passes through the linker via
//    LinkedVerseText. Enumerated live from the data files, so new writing is measured automatically.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadLinker, stripMarkup } from "./loadLinker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function loadBible() {
  const gz = fs.readFileSync(path.join(HERE, "corpus/web-bible.json.gz"));
  return JSON.parse(zlib.gunzipSync(gz).toString("utf8"));
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
  const { locations, pois, people, topics, bookIntros, timelineEvents } = await loadLinker();
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
    (h.facts ?? []).forEach((x) => add("location.history.facts", l.id, x));
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
  Object.entries(bookIntros).forEach(([book, i]) => {
    add("bookIntro.whyWritten", undefined, i.whyWritten);
    (i.summary ?? []).forEach((x) => add("bookIntro.summary", undefined, x));
    (i.manuscripts ?? []).forEach((x) => add("bookIntro.manuscripts", undefined, x));
    void book;
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
 * This file is small enough to keep forever and catches both. */
export async function snapshotKeyTotals(verses, blocks) {
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
  for (const b of blocks) for (const a of computeLinkAnnotations(b.text, b.owner)) bump("prose", a);
  return [...tally.entries()].map(([k, n]) => `${k}\t${n}`).sort();
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
