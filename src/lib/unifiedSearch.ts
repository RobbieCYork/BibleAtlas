import type { Location, Person, PointOfInterest, Topic, TimelineEvent } from "../data/types";

/** The header's "Search anything" index over the app's own records (Scripture is searched by the
 * component against bolls.life, and references are parsed by lib/bibleReference). This module is
 * imported lazily, on first focus of the search box, so none of it weighs on first paint.
 *
 * FREE FIELDS ONLY. Names, alternate names, summaries/one-line descriptions, type/role labels and
 * Scripture references. Article bodies (life stories, topic sections, location facts) are a Capstone
 * Plus feature on the paid-content work: searching them would leak paid text through snippets, and
 * would stop being correct the day the paywall merges. If body search is ever wanted it has to be
 * server-side against entitlement, not here. */

export type RecordSection = "people" | "places" | "articles" | "timeline";
export type RecordKind = "location" | "poi" | "person" | "topic" | "timelineEvent";

export interface IndexEntry {
  section: RecordSection;
  kind: RecordKind;
  id: string;
  name: string;
  typeLabel: string;
  summary: string;
  names: string[];
  rest: string;
  refs: string;
}

export interface SourceData {
  locations: Location[];
  pois: PointOfInterest[];
  people: Person[];
  topics: Topic[];
  timelineEvents: TimelineEvent[];
}

const low = (s: string) => s.toLowerCase();
const refsOf = (v: { reference: string }[] | undefined) => (v ?? []).map((r) => r.reference).join(" ").toLowerCase();

export function buildIndex(d: SourceData): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (const l of d.locations) {
    out.push({
      section: "places",
      kind: "location",
      id: l.id,
      name: l.name,
      typeLabel: `Place · ${l.category}`,
      summary: l.modernName ? `Modern name: ${l.modernName}` : "",
      names: [l.name, ...(l.alternateNames ?? []), l.modernName ?? ""].filter(Boolean).map(low),
      rest: low(l.category),
      refs: refsOf(l.verses),
    });
  }
  for (const o of d.pois) {
    out.push({
      section: "places",
      kind: "poi",
      id: o.id,
      name: o.name,
      typeLabel: `Site · ${o.tag}`,
      summary: o.description,
      names: [o.name, ...(o.alternateNames ?? []), o.modernName ?? ""].filter(Boolean).map(low),
      rest: low(`${o.description} ${o.tag}`),
      refs: "",
    });
  }
  for (const o of d.people) {
    out.push({
      section: "people",
      kind: "person",
      id: o.id,
      name: o.name,
      typeLabel: o.role,
      summary: o.summary,
      names: [o.name, ...(o.alternateNames ?? [])].map(low),
      rest: low(`${o.summary} ${o.role}`),
      refs: refsOf(o.verses),
    });
  }
  for (const t of d.topics) {
    const label = t.category === "discovery" ? "Discovery" : t.category === "manuscript" ? "Manuscript" : "Topic";
    out.push({
      section: "articles",
      kind: "topic",
      id: t.id,
      name: t.name,
      typeLabel: `${label} · ${t.role}`,
      summary: t.summary,
      names: [t.name, ...(t.alternateNames ?? [])].map(low),
      rest: low(`${t.summary} ${t.role}`),
      refs: refsOf(t.verses),
    });
  }
  for (const e of d.timelineEvents) {
    out.push({
      section: "timeline",
      kind: "timelineEvent",
      id: e.id,
      name: e.title,
      typeLabel: e.dateLabel ? `${e.dateLabel} · ${e.era}` : e.era,
      summary: e.summary,
      names: [low(e.title)],
      rest: low(`${e.summary} ${e.era}`),
      refs: "",
    });
  }
  return out;
}

/** Lower is better; null = no match. Title matches always outrank summary matches, which always
 * outrank reference-only matches. */
function score(entry: IndexEntry, q: string, words: string[]): number | null {
  if (entry.names.some((n) => n === q)) return 0;
  if (entry.names.some((n) => n.startsWith(q))) return 1;
  if (entry.names.some((n) => n.split(/[\s,()-]+/).some((w) => w.startsWith(q)))) return 2;
  if (entry.names.some((n) => n.includes(q))) return 3;
  const hay = (s: string) => words.every((w) => s.includes(w));
  if (hay(entry.names.join(" "))) return 4;
  if (entry.rest.includes(q)) return 5;
  if (hay(`${entry.names.join(" ")} ${entry.rest}`)) return 6;
  if (entry.refs.includes(q)) return 7;
  return null;
}

export const SECTION_CAP = 30;

export function searchIndex(index: IndexEntry[], rawQuery: string): Record<RecordSection, IndexEntry[]> {
  const q = rawQuery.trim().toLowerCase();
  const out: Record<RecordSection, IndexEntry[]> = { people: [], places: [], articles: [], timeline: [] };
  if (!q) return out;
  const words = q.split(/\s+/).filter(Boolean);
  const scored: { e: IndexEntry; s: number }[] = [];
  for (const e of index) {
    const s = score(e, q, words);
    if (s !== null) scored.push({ e, s });
  }
  scored.sort((a, b) => a.s - b.s || a.e.name.localeCompare(b.e.name));
  for (const { e } of scored) if (out[e.section].length < SECTION_CAP) out[e.section].push(e);
  return out;
}

/** A ~120 character window of the summary around the first match. */
export function snippet(summary: string, rawQuery: string): string {
  if (!summary) return "";
  const q = rawQuery.trim().toLowerCase();
  const lower = summary.toLowerCase();
  let at = lower.indexOf(q);
  if (at < 0) {
    const hits = q.split(/\s+/).map((w) => lower.indexOf(w)).filter((i) => i >= 0);
    at = hits.length ? Math.min(...hits) : -1;
  }
  if (at < 40) return summary.length > 120 ? summary.slice(0, 117).trimEnd() + "…" : summary;
  const start = Math.max(0, at - 30);
  const end = Math.min(summary.length, start + 120);
  return (start > 0 ? "…" : "") + summary.slice(start, end).trim() + (end < summary.length ? "…" : "");
}
