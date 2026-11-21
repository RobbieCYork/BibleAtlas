import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Location, Person, PointOfInterest, Topic, TimelineEvent } from "../data/types";
import Icon, { type IconName } from "./Icon";

type ArticleKind = "location" | "poi" | "person" | "topic" | "timelineEvent";

interface IndexEntry {
  kind: ArticleKind;
  id: string;
  name: string;
  typeLabel: string;
  /** The free summary shown (and searched) under the title. */
  summary: string;
  /** Lowercased searchable text, per tier. Tier 0 = title/alternate names, tier 1 = summary and
   * type label, tier 2 = Scripture references.
   *
   * DELIBERATELY NO BODY TEXT. Article bodies (life stories, topic sections, location histories
   * beyond the summary) are a Capstone Plus feature on the paid-content work: searching them would
   * leak paid text through snippets, and would stop being correct the day the paywall merges. If
   * body search is ever wanted it must be done server-side against entitlement, not here. */
  names: string[];
  rest: string;
  refs: string;
}

interface ArticleSearchBarProps {
  locations: Location[];
  pois: PointOfInterest[];
  people: Person[];
  topics: Topic[];
  timelineEvents: TimelineEvent[];
  onSelect: (kind: ArticleKind, id: string) => void;
}

const KIND_ICON: Record<ArticleKind, IconName> = {
  location: "place",
  poi: "poi",
  person: "people",
  topic: "topics",
  timelineEvent: "timelineEvent",
};

const KIND_LABEL: Record<ArticleKind, string> = {
  location: "Place",
  poi: "Point of Interest",
  person: "Person",
  topic: "Topic",
  timelineEvent: "Event",
};

const MAX_RESULTS = 12;

function buildIndex(p: Omit<ArticleSearchBarProps, "onSelect">): IndexEntry[] {
  const refsOf = (v: { reference: string }[] | undefined) => (v ?? []).map((r) => r.reference).join(" ").toLowerCase();
  const out: IndexEntry[] = [];
  for (const l of p.locations) {
    out.push({
      kind: "location",
      id: l.id,
      name: l.name,
      typeLabel: `${KIND_LABEL.location} · ${l.category}`,
      summary: l.modernName ? `Modern name: ${l.modernName}` : "",
      names: [l.name, ...(l.alternateNames ?? []), l.modernName ?? ""].filter(Boolean).map((s) => s.toLowerCase()),
      rest: l.category.toLowerCase(),
      refs: refsOf(l.verses),
    });
  }
  for (const o of p.pois) {
    out.push({
      kind: "poi",
      id: o.id,
      name: o.name,
      typeLabel: `${KIND_LABEL.poi} · ${o.tag}`,
      summary: o.description,
      names: [o.name, ...(o.alternateNames ?? []), o.modernName ?? ""].filter(Boolean).map((s) => s.toLowerCase()),
      rest: `${o.description} ${o.tag}`.toLowerCase(),
      refs: "",
    });
  }
  for (const o of p.people) {
    out.push({
      kind: "person",
      id: o.id,
      name: o.name,
      typeLabel: `${KIND_LABEL.person} · ${o.role}`,
      summary: o.summary,
      names: [o.name, ...(o.alternateNames ?? [])].map((s) => s.toLowerCase()),
      rest: `${o.summary} ${o.role}`.toLowerCase(),
      refs: refsOf(o.verses),
    });
  }
  for (const t of p.topics) {
    const label =
      t.category === "discovery" ? "Discovery" : t.category === "manuscript" ? "Manuscript" : KIND_LABEL.topic;
    out.push({
      kind: "topic",
      id: t.id,
      name: t.name,
      typeLabel: `${label} · ${t.role}`,
      summary: t.summary,
      names: [t.name, ...(t.alternateNames ?? [])].map((s) => s.toLowerCase()),
      rest: `${t.summary} ${t.role}`.toLowerCase(),
      refs: refsOf(t.verses),
    });
  }
  for (const e of p.timelineEvents) {
    out.push({
      kind: "timelineEvent",
      id: e.id,
      name: e.title,
      typeLabel: `${KIND_LABEL.timelineEvent} · ${e.era}`,
      summary: e.summary,
      names: [e.title.toLowerCase()],
      rest: `${e.summary} ${e.era}`.toLowerCase(),
      refs: "",
    });
  }
  return out;
}

/** Lower is better; null = no match. All query words must match somewhere. */
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

function highlight(text: string, words: string[]): ReactNode {
  const ws = words.filter(Boolean);
  if (!ws.length) return text;
  const re = new RegExp(`(${ws.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="article-search-mark">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/** A ~110 character window of the summary around the first match. */
function snippet(summary: string, q: string, words: string[]): string {
  if (!summary) return "";
  const lower = summary.toLowerCase();
  let at = lower.indexOf(q);
  if (at < 0) at = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0), Infinity);
  if (!Number.isFinite(at) || at < 0 || at < 40) return summary.length > 120 ? summary.slice(0, 117).trimEnd() + "…" : summary;
  const start = Math.max(0, at - 30);
  const end = Math.min(summary.length, start + 120);
  return (start > 0 ? "…" : "") + summary.slice(start, end).trim() + (end < summary.length ? "…" : "");
}

/** Header search for Articles mode — the fifth article kinds (places, points of interest, people,
 * topics, timeline events) searched together, client-side, over free fields only. Same dropdown idiom
 * as SearchBar; keyboard: arrows move, Enter opens, Escape closes. */
export default function ArticleSearchBar({
  locations,
  pois,
  people,
  topics,
  timelineEvents,
  onSelect,
}: ArticleSearchBarProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const index = useMemo(
    () => buildIndex({ locations, pois, people, topics, timelineEvents }),
    [locations, pois, people, topics, timelineEvents]
  );

  const q = debounced.trim().toLowerCase();
  const words = useMemo(() => q.split(/\s+/).filter(Boolean), [q]);

  const results = useMemo(() => {
    if (!q) return [];
    const scored: { e: IndexEntry; s: number }[] = [];
    for (const e of index) {
      const s = score(e, q, words);
      if (s !== null) scored.push({ e, s });
    }
    scored.sort((a, b) => a.s - b.s || a.e.name.localeCompare(b.e.name));
    return scored.slice(0, MAX_RESULTS).map((r) => r.e);
  }, [q, words, index]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (e: IndexEntry) => {
    onSelect(e.kind, e.id);
    setOpen(false);
  };

  const showList = open && query.trim() !== "";
  const pending = query.trim() !== debounced.trim();

  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">
        <Icon name="articles" />
      </span>
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls="article-search-results"
        aria-autocomplete="list"
        aria-label="Search articles"
        aria-activedescendant={showList && results[active] ? `article-search-opt-${active}` : undefined}
        placeholder="Search articles..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            if (showList && !pending && results[active]) {
              e.preventDefault();
              choose(results[active]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul className="search-results article-search-results" id="article-search-results" role="listbox" ref={listRef}>
          {pending ? (
            <li className="search-results-empty">Searching…</li>
          ) : results.length > 0 ? (
            results.map((e, i) => (
              <li
                key={`${e.kind}-${e.id}`}
                id={`article-search-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  choose(e);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="article-search-icon" aria-hidden="true">
                  <Icon name={KIND_ICON[e.kind]} />
                </span>
                <span className="article-search-text">
                  <span className="search-result-name">{highlight(e.name, words)}</span>
                  <span className="search-result-category">{e.typeLabel}</span>
                  {e.summary && (
                    <span className="article-search-snippet">{highlight(snippet(e.summary, q, words), words)}</span>
                  )}
                </span>
              </li>
            ))
          ) : (
            <li className="search-results-empty">No articles found</li>
          )}
        </ul>
      )}
    </div>
  );
}
