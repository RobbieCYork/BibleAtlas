/**
 * paidContentSpec.ts — WHICH FIELDS OF AN ARTICLE ARE CAPSTONE PLUS, in one place.
 *
 * Read automation/manager/paid-tier-plan.md (Architecture B, and Robbie's 2026-11-17 change at its
 * foot) before editing this file. The line is "the Bible references list and up are free; everything
 * below it is paid": name, pronunciation, alternate names, lifespan, summary/teaser, the discovery /
 * manuscript facts block and the references list stay in the app bundle and on the public pages;
 * Reflect, life story, article sections, history, archaeology, evidence, sources and further reading
 * move to the `content_paid` table (sql/043) behind `has_entitlement('plus')`.
 *
 * This module is imported by THREE things, which is the point of it existing once:
 *   1. the app (src/lib/paidContent.ts) — in `bundle` mode it cuts the paid body out of the full
 *      record it already has, so the panels render exactly what they render today;
 *   2. the Vite plugin (vite-plugin-paid-content.ts) — in `server` mode it replaces the five data
 *      modules with `freeEmission()` of every record, so the paid text is not in the bundle at all;
 *   3. scripts/paid-content/split.mjs — writes the `content_paid` seed from `splitRecord()` and proves
 *      `mergeRecord(free, paid)` reassembles every record byte-for-byte.
 * A field moved across the line here moves in all three at once. Nothing else may hard-code the list.
 *
 * It must stay free of runtime imports (types only): the plugin and the split script bundle it with
 * rolldown into Node, where the app's modules (supabase, React) cannot load.
 */
import type { Location, Person, PointOfInterest, TimelineEvent, Topic } from "../data/types";

/** Same vocabulary as `article_reads.kind` (sql/041) and ArticleKind in lib/articleReads.ts. */
export type PaidKind = "place" | "site" | "person" | "topic" | "event";

export const PAID_KINDS: readonly PaidKind[] = ["place", "site", "person", "topic", "event"];

export interface RecordByKind {
  place: Location;
  site: PointOfInterest;
  person: Person;
  topic: Topic;
  event: TimelineEvent;
}

/**
 * The paid keys of each record type — every top-level field rendered BELOW the references list.
 * Everything not listed here is free (it is in the bundle, the search index, the auto-linker's name
 * tables and the public SEO page).
 *
 * Deliberate calls, each one a line in the plan:
 *  - person.quotes ("In Their Own Words") is paid. Robbie's change kept the BIBLE references list
 *    free; a church figure's quotations from their own writings are not that list.
 *  - person.occupation is paid (plan table). It is a short field but it sits below the cut.
 *  - event.scriptureRefs is free (it is the event's Bible references list); event.externalRefs —
 *    ancient witnesses and book titles — is paid with the rest of the "how we know" material.
 *  - topic.discovery / topic.manuscript (the facts block) stay free: short, factual, the best teaser.
 *  - location.history is paid as a whole, but `freeEmission` keeps notableFacts[0] — the share card
 *    and the places trivia already publish that one line, and the plan names it as the teaser
 *    fallback until capstone-content writes `teaser` for all 117 places.
 */
export const PAID_KEYS = {
  place: ["reflectionPrompt", "history", "archaeology", "sources"],
  site: ["description", "reflectionPrompt", "archaeology", "sources"],
  person: [
    "quotes",
    "reflectionPrompt",
    "lifeStory",
    "occupation",
    "placesLived",
    "controversies",
    "lifespanDatingNotes",
    "extraBiblicalReferences",
    "noExtraBiblicalRecordNote",
    "sources",
  ],
  topic: ["reflectionPrompt", "sections", "citations", "sources"],
  event: ["article", "datingNotes", "externalRefs", "sources"],
} as const satisfies { [K in PaidKind]: readonly (keyof RecordByKind[K])[] };

export type PaidKeyOf<K extends PaidKind> = (typeof PAID_KEYS)[K][number];

/** What `content_paid.body` holds for one record: exactly its paid keys, those it has. */
export type PaidBody<K extends PaidKind> = Partial<Pick<RecordByKind[K], PaidKeyOf<K> & keyof RecordByKind[K]>>;

/** Cheap counts of what sits behind the cut, shown on the teaser ("6 sections · 9 sources"). */
export interface PaidCounts {
  /** Headed blocks of prose: topic sections, a person's life story + debates + dating, etc. */
  sections: number;
  /** Paragraphs of article prose. */
  paragraphs: number;
  /** Sources + citations + further reading + extra-biblical witnesses. */
  sources: number;
  /** 1 when there is an archaeology note. */
  archaeology: number;
  /** 1 when there is a Reflect card. */
  reflect: number;
}

/**
 * Build-time extras a `server`-mode free record carries under one hidden key, because the paid
 * fields they are derived from are not in the bundle any more. Never authored; never in src/data.
 */
export interface FreeExtras {
  counts: PaidCounts;
  /** The free lead line for places and sites (see placeLead / siteLead). */
  lead?: string;
}
export const FREE_EXTRAS_KEY = "__paid" as const;

type AnyRecord = Record<string, unknown>;

const has = (r: AnyRecord, k: string) => Object.prototype.hasOwnProperty.call(r, k);

/** Splits one record into its free part (every key not in PAID_KEYS) and its paid body. Key order of
 * both halves follows the record's own order, so the output is deterministic. */
export function splitRecord<K extends PaidKind>(
  kind: K,
  record: RecordByKind[K]
): { free: AnyRecord; paid: PaidBody<K> } {
  const paidKeys = new Set<string>(PAID_KEYS[kind]);
  const free: AnyRecord = {};
  const paid: AnyRecord = {};
  for (const [k, v] of Object.entries(record as unknown as AnyRecord)) {
    if (paidKeys.has(k)) paid[k] = v;
    else free[k] = v;
  }
  return { free, paid: paid as PaidBody<K> };
}

/** The paid body alone — what `bundle` mode hands the panels, and what sql/043 stores. */
export function pickPaid<K extends PaidKind>(kind: K, record: RecordByKind[K]): PaidBody<K> {
  return splitRecord(kind, record).paid;
}

/** Inverse of splitRecord. The split script proves merge(split(r)) === r for every record. */
export function mergeRecord(free: AnyRecord, paid: AnyRecord): AnyRecord {
  return { ...free, ...paid };
}

const len = (a: unknown) => (Array.isArray(a) ? a.length : 0);
const paragraphsOf = (s: unknown) =>
  typeof s === "string" ? s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length : 0;

/** Counts from a FULL record. */
export function computeCounts<K extends PaidKind>(kind: K, record: RecordByKind[K]): PaidCounts {
  const r = record as unknown as AnyRecord;
  const c: PaidCounts = {
    sections: 0,
    paragraphs: 0,
    sources: len(r.sources),
    archaeology: r.archaeology ? 1 : 0,
    reflect: r.reflectionPrompt ? 1 : 0,
  };
  switch (kind) {
    case "place": {
      const h = (r.history ?? {}) as AnyRecord;
      c.sections = ["founded", "population", "rulers", "industry"].filter((k) => h[k] && (len(h[k]) || typeof h[k] === "string")).length +
        (len(h.notableFacts) ? 1 : 0);
      c.paragraphs = len(h.notableFacts);
      break;
    }
    case "site":
      c.sections = 1;
      c.paragraphs = typeof r.description === "string" ? 1 : 0;
      break;
    case "person":
      c.paragraphs = len(r.lifeStory);
      c.sections = 1 + ["occupation", "placesLived", "lifespanDatingNotes"].filter((k) => !!r[k]).length + (len(r.controversies) ? 1 : 0);
      c.sources += len(r.extraBiblicalReferences);
      break;
    case "topic": {
      const sections = (r.sections ?? []) as { paragraphs?: unknown[] }[];
      c.sections = sections.length;
      c.paragraphs = sections.reduce((n, s) => n + len(s.paragraphs), 0);
      c.sources += len(r.citations);
      break;
    }
    case "event":
      c.paragraphs = paragraphsOf(r.article);
      c.sections = (r.datingNotes ? 1 : 0) + (c.paragraphs ? 1 : 0);
      c.sources += len(r.externalRefs);
      break;
  }
  return c;
}

/** Counts for any record the app holds — a full one (bundle mode) or a free one (server mode). */
export function countsOf<K extends PaidKind>(kind: K, record: RecordByKind[K]): PaidCounts {
  const extras = (record as unknown as AnyRecord)[FREE_EXTRAS_KEY] as FreeExtras | undefined;
  return extras?.counts ?? computeCounts(kind, record);
}

/** Collapses whitespace and ellipsizes at a word boundary — the same rule as shareCard.ts `excerpt`,
 * kept here so the lead is computed identically at build time and in the app. */
export function leadExcerpt(text: string, max = 140): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.]*$/, "") + "…";
}

/** The free one-line lead for a place: its authored `teaser`, else the line the share card has
 * always used (first notable fact, else founded, else industry, else the modern name). */
export function placeLead(loc: Location): string {
  if (loc.teaser) return loc.teaser;
  const extras = (loc as unknown as AnyRecord)[FREE_EXTRAS_KEY] as FreeExtras | undefined;
  if (extras?.lead !== undefined) return extras.lead;
  const h = loc.history;
  return h?.notableFacts?.[0] ?? h?.founded ?? h?.industry ?? loc.modernName ?? "";
}

/** The free lead for a site: its authored `teaser`, else the first ~140 characters of the
 * description, cut exactly as the share card has always cut it. */
export function siteLead(poi: PointOfInterest): string {
  if (poi.teaser) return poi.teaser;
  const extras = (poi as unknown as AnyRecord)[FREE_EXTRAS_KEY] as FreeExtras | undefined;
  if (extras?.lead !== undefined) return extras.lead;
  return leadExcerpt(poi.description ?? "");
}

/**
 * The record as it is emitted into the app bundle in `server` mode: the free part, plus inert
 * placeholders for the REQUIRED paid fields so any code that still reads one gets an empty value
 * instead of a crash, plus the build-time extras. `freeEmission(r)` contains no paid text except the
 * single lead line documented on PAID_KEYS.
 */
export function freeEmission<K extends PaidKind>(kind: K, record: RecordByKind[K]): AnyRecord {
  const { free } = splitRecord(kind, record);
  const full = record as unknown as AnyRecord;
  const extras: FreeExtras = { counts: computeCounts(kind, record) };
  switch (kind) {
    case "place": {
      const loc = record as unknown as Location;
      extras.lead = placeLead(loc);
      const first = loc.history?.notableFacts?.[0];
      free.history = { notableFacts: first !== undefined ? [first] : [] };
      break;
    }
    case "site":
      extras.lead = siteLead(record as unknown as PointOfInterest);
      free.description = "";
      free.archaeology = { note: "", photos: [] };
      break;
    case "person":
      free.lifeStory = [];
      break;
    case "topic":
      free.sections = [];
      break;
    case "event":
      free.article = "";
      break;
  }
  if (!has(full, "id")) throw new Error(`record without id in ${kind}`);
  free[FREE_EXTRAS_KEY] = extras;
  return free;
}
