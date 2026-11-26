import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Location, Person, PointOfInterest, Topic, TimelineEvent } from "../data/types";
import { BOOKS } from "../data/bibleBooks";
import { shouldNavigate, suggestReference } from "../lib/bibleReference";
import Icon, { type IconName } from "./Icon";
import type { IndexEntry, RecordKind, RecordSection } from "../lib/unifiedSearch";
import { searchDownloaded } from "../lib/offline/text";
import { getStoredTranslation } from "../lib/bibleTranslation";

type UnifiedModule = typeof import("../lib/unifiedSearch");
type SectionKey = "scripture" | RecordSection;
type Filter = "all" | SectionKey;

interface ScriptureHit {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

interface UnifiedSearchBarProps {
  locations: Location[];
  pois: PointOfInterest[];
  people: Person[];
  topics: Topic[];
  timelineEvents: TimelineEvent[];
  /** Opens a record exactly as the old Places search, the Articles panel and the Timeline search
   * did — the caller owns map sync, panel switching and back-trail handling. */
  onOpenRecord: (kind: RecordKind, id: string) => void;
  /** A reference like "John 3:16" — navigate the Bible panel there. */
  onOpenScripture: (reference: string) => void;
  /** Run the old Scripture word search in the Bible panel (its full results list). */
  onSeeAllScripture: (query: string) => void;
}

const SECTION_META: Record<SectionKey, { label: string; icon: IconName }> = {
  scripture: { label: "Scripture", icon: "bible" },
  people: { label: "People", icon: "people" },
  places: { label: "Places", icon: "place" },
  articles: { label: "Articles", icon: "articles" },
  timeline: { label: "Timeline", icon: "timelineEvent" },
};
const SECTION_ORDER: SectionKey[] = ["scripture", "people", "places", "articles", "timeline"];
const KIND_ICON: Record<RecordKind, IconName> = {
  location: "place",
  poi: "poi",
  person: "people",
  topic: "topics",
  timelineEvent: "timelineEvent",
};

const COLLAPSED_ROWS = 5;
const SCRIPTURE_CAP = 30;
const MIN_SCRIPTURE_CHARS = 3;
const RECENT_KEY = "capstone-search-recent";
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* private mode — recents are a convenience */
  }
}

function highlight(text: string, words: string[]): ReactNode {
  const ws = words.filter(Boolean);
  if (!ws.length) return text;
  const re = new RegExp(`(${ws.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="search-hit-mark">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const cleanScripture = (raw: string) => raw.replace(/<S>\d+<\/S>/g, "").replace(/<\/?mark>/g, "");

interface Row {
  key: string;
  run: () => void;
  node: ReactNode;
  className?: string;
}
interface SectionView {
  key: SectionKey;
  label: string;
  icon: IconName;
  countLabel: string;
  rows: Row[];
  moreRow: Row | null;
}

/** The header's single "Search anything" box. One input; results are grouped into Scripture, People,
 * Places, Articles and Timeline sections, with chip jump-filters at the top. A query that is clearly
 * a Scripture reference ("john 3:16", "jn 3") shows a "Go to" row first and Enter takes it. */
export default function UnifiedSearchBar({
  locations,
  pois,
  people,
  topics,
  timelineEvents,
  onOpenRecord,
  onOpenScripture,
  onSeeAllScripture,
}: UnifiedSearchBarProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [scriptureQuery, setScriptureQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<SectionKey>>(new Set());
  const [active, setActive] = useState(-1);
  const [mod, setMod] = useState<UnifiedModule | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [scripture, setScripture] = useState<{ q: string; status: "loading" | "ok" | "error"; hits: ScriptureHit[] } | null>(
    null
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const cache = useRef(new Map<string, ScriptureHit[]>());

  // Lazy: the index code is fetched the first time the box is used, never on first paint.
  const ensureModule = () => {
    if (!mod) import("../lib/unifiedSearch").then(setMod);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    const s = setTimeout(() => setScriptureQuery(query), 400);
    return () => {
      clearTimeout(t);
      clearTimeout(s);
    };
  }, [query]);

  const index = useMemo(
    () => (mod ? mod.buildIndex({ locations, pois, people, topics, timelineEvents }) : null),
    [mod, locations, pois, people, topics, timelineEvents]
  );

  const q = debounced.trim();
  const words = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);
  const pending = query.trim() !== q;

  const reference = useMemo(() => {
    const s = suggestReference(query);
    return s && shouldNavigate(s) ? s : null;
  }, [query]);
  const referenceText = reference
    ? reference.verse
      ? `${reference.book} ${reference.chapter}:${reference.verse}`
      : `${reference.book} ${reference.chapter}`
    : null;

  const records = useMemo(() => (mod && index && q ? mod.searchIndex(index, q) : null), [mod, index, q]);

  // Scripture word search against bolls.life, as the Bible panel does — debounced harder than the
  // local index because it is a network call, and skipped for references and one/two-letter noise.
  useEffect(() => {
    const sq = scriptureQuery.trim();
    if (reference || sq.length < MIN_SCRIPTURE_CHARS) {
      setScripture(null);
      return;
    }
    const cached = cache.current.get(sq.toLowerCase());
    if (cached) {
      setScripture({ q: sq, status: "ok", hits: cached });
      return;
    }
    const ctl = new AbortController();
    setScripture({ q: sq, status: "loading", hits: [] });
    const done = (found: ScriptureHit[]) => {
      const hits = found.filter((h) => BOOKS[h.book - 1]).slice(0, SCRIPTURE_CAP);
      cache.current.set(sq.toLowerCase(), hits);
      setScripture({ q: sq, status: "ok", hits });
    };
    // A downloaded translation is searched on the device: the WEB when it is there, and with no
    // connection whichever translation the reader reads in.
    (async () => {
      const local =
        (await searchDownloaded("web", sq, SCRIPTURE_CAP).catch(() => null)) ??
        (navigator.onLine ? null : await searchDownloaded(getStoredTranslation() ?? "web", sq, SCRIPTURE_CAP).catch(() => null));
      if (ctl.signal.aborted) return;
      if (local) return done(local);
      const r = await fetch(`https://bolls.life/find/WEB/?search=${encodeURIComponent(sq)}&match_case=false&match_whole=false`, {
        signal: ctl.signal,
      });
      if (!r.ok) throw new Error("search failed");
      done((await r.json()) as ScriptureHit[]);
    })().catch((e) => {
      if (e?.name !== "AbortError") setScripture({ q: sq, status: "error", hits: [] });
    });
    return () => ctl.abort();
  }, [scriptureQuery, reference]);

  const recordPick = (text: string) => {
    const next = [text, ...recent.filter((r) => r.toLowerCase() !== text.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    writeRecent(next);
  };

  const finish = (shown: string) => {
    if (q) recordPick(q);
    setQuery(shown);
    setDebounced(shown);
    setScriptureQuery(shown);
    setOpen(false);
  };

  const scriptureFresh = scripture && scripture.q.toLowerCase() === scriptureQuery.trim().toLowerCase() ? scripture : null;

  // ---- view model ---------------------------------------------------------------------------
  const sections = useMemo<SectionView[]>(() => {
    if (!q) return [];
    const out: SectionView[] = [];
    const showAll = (k: SectionKey) => filter !== "all" || expanded.has(k);

    const finalize = (key: SectionKey, rows: Row[], total: number, capped: boolean) => {
      const limit = showAll(key) ? rows.length : COLLAPSED_ROWS;
      const hidden = rows.length - limit;
      out.push({
        key,
        label: SECTION_META[key].label,
        icon: SECTION_META[key].icon,
        countLabel: `${total}${capped ? "+" : ""}`,
        rows: rows.slice(0, limit),
        moreRow:
          hidden > 0
            ? {
                key: `${key}-more`,
                run: () => setExpanded((s) => new Set(s).add(key)),
                className: "unified-more",
                node: <span>Show {hidden} more {SECTION_META[key].label.toLowerCase()}</span>,
              }
            : null,
      });
    };

    // Scripture
    if (scriptureFresh && scriptureFresh.status === "ok" && scriptureFresh.hits.length > 0) {
      const hits = scriptureFresh.hits;
      const rows: Row[] = hits.map((h) => {
        const book = BOOKS[h.book - 1].name;
        const sect = h.book <= 39 ? "ot" : h.book <= 43 ? "gospel" : "nt";
        const ref = `${book} ${h.chapter}:${h.verse}`;
        return {
          key: `s-${h.book}-${h.chapter}-${h.verse}`,
          run: () => {
            onOpenScripture(ref);
            finish(q);
          },
          node: (
            <>
              <span className={`bible-search-result-ref bible-search-result-ref-${sect}`}>{ref}</span>
              <span className="unified-verse">{highlight(cleanScripture(h.text), words)}</span>
            </>
          ),
        };
      });
      finalize("scripture", rows, hits.length, hits.length >= SCRIPTURE_CAP);
      const sec = out[out.length - 1];
      const tail: Row = {
        key: "s-all",
        className: "unified-more",
        run: () => {
          onSeeAllScripture(q);
          finish(q);
        },
        node: <span>See all Scripture results in the Bible panel</span>,
      };
      sec.rows.push(tail);
    }

    // Records
    if (records) {
      (["people", "places", "articles", "timeline"] as RecordSection[]).forEach((sk) => {
        const list = records[sk];
        if (!list.length) return;
        const rows: Row[] = list.map((e: IndexEntry) => ({
          key: `${e.kind}-${e.id}`,
          run: () => {
            onOpenRecord(e.kind, e.id);
            finish(e.name);
          },
          node: (
            <>
              <span className="unified-icon" aria-hidden="true">
                <Icon name={KIND_ICON[e.kind]} />
              </span>
              <span className="unified-text">
                <span className="search-result-name">{highlight(e.name, words)}</span>
                <span className="search-result-category">{e.typeLabel}</span>
                {e.summary && mod && <span className="unified-snippet">{highlight(mod.snippet(e.summary, q), words)}</span>}
              </span>
            </>
          ),
        }));
        finalize(sk, rows, list.length, list.length >= (mod?.SECTION_CAP ?? 30));
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, records, scriptureFresh, filter, expanded, words, mod]);

  const visible = filter === "all" ? sections : sections.filter((s) => s.key === filter);

  const referenceRow: Row | null = referenceText
    ? {
        key: "ref",
        className: "unified-goto",
        run: () => {
          onOpenScripture(referenceText);
          finish(referenceText);
        },
        node: (
          <>
            <span className="bible-search-result-ref">{referenceText}</span>
            <span className="unified-verse">Go to this passage</span>
          </>
        ),
      }
    : null;

  const recentRows: Row[] =
    !query.trim() && recent.length
      ? recent.map((r) => ({
          key: `r-${r}`,
          run: () => {
            setQuery(r);
            setDebounced(r);
            setScriptureQuery(r);
          },
          node: (
            <>
              <span className="unified-icon" aria-hidden="true">
                <Icon name="search" />
              </span>
              <span className="unified-text">
                <span className="search-result-name">{r}</span>
              </span>
            </>
          ),
        }))
      : [];

  const flat: Row[] = [
    ...(referenceRow ? [referenceRow] : []),
    ...visible.flatMap((s) => [...s.rows, ...(s.moreRow ? [s.moreRow] : [])]),
    ...recentRows,
  ];
  const indexOfRow = (key: string) => flat.findIndex((r) => r.key === key);

  // A reference query starts with its "Go to" row armed so Enter goes straight there; any other
  // query starts with nothing armed, so Enter keeps its old meaning — the Scripture word search.
  useEffect(() => {
    setActive(referenceText ? 0 : -1);
    setFilter("all");
    setExpanded(new Set());
  }, [q, referenceText]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const showPanel = open && (query.trim() !== "" || recentRows.length > 0);
  const scriptureLoading = !!scriptureFresh && scriptureFresh.status === "loading";
  const scriptureError = !!scriptureFresh && scriptureFresh.status === "error";
  const settled = !pending && !!mod && !scriptureLoading && (!!reference || sections.length > 0 || !!records);
  const nothing = !!q && settled && !referenceRow && sections.length === 0;

  const chipCount = (k: SectionKey) => sections.find((s) => s.key === k)?.countLabel;

  const renderRow = (r: Row) => {
    const i = indexOfRow(r.key);
    return (
      <li
        key={r.key}
        id={`unified-opt-${i}`}
        role="option"
        aria-selected={i === active}
        className={`unified-row${r.className ? ` ${r.className}` : ""}${i === active ? " active" : ""}`}
        onMouseDown={(ev) => {
          ev.preventDefault();
          r.run();
        }}
        onMouseEnter={() => setActive(i)}
      >
        {r.node}
      </li>
    );
  };

  return (
    <div className="search-bar unified-search">
      <span className="search-bar-icon" aria-hidden="true">
        <Icon name="search" />
      </span>
      <input
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="unified-search-results"
        aria-autocomplete="list"
        aria-label="Search anything"
        aria-activedescendant={showPanel && active >= 0 && flat[active] ? `unified-opt-${active}` : undefined}
        placeholder="Search anything..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          ensureModule();
        }}
        onFocus={() => {
          setOpen(true);
          ensureModule();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, flat.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (active >= 0 && flat[active]) flat[active].run();
            else if (reference && referenceRow) referenceRow.run();
            else if (query.trim()) {
              // Nothing armed: the old Scripture box's Enter — the full word search in the Bible panel.
              onSeeAllScripture(query.trim());
              finish(query.trim());
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showPanel && (
        <div className="search-results unified-results" id="unified-search-results" role="listbox" ref={listRef}>
          {recentRows.length > 0 && (
            <>
              <div className="unified-section-head">
                <span className="unified-section-title">Recent searches</span>
                <button
                  type="button"
                  className="bible-search-results-clear"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setRecent([]);
                    writeRecent([]);
                  }}
                >
                  Clear
                </button>
              </div>
              <ul className="unified-list">{recentRows.map(renderRow)}</ul>
            </>
          )}
          {query.trim() !== "" && (
            <>
              {referenceRow && <ul className="unified-list unified-goto-list">{renderRow(referenceRow)}</ul>}
              {sections.length > 0 && (
                <div className="unified-chips" role="group" aria-label="Filter results">
                  {(["all", ...SECTION_ORDER] as Filter[])
                    .filter((k) => k === "all" || chipCount(k as SectionKey))
                    .map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`unified-chip${filter === k ? " active" : ""}`}
                        aria-pressed={filter === k}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFilter(k);
                          setActive(-1);
                        }}
                      >
                        {k === "all" ? "All" : SECTION_META[k as SectionKey].label}
                        {k !== "all" && <span className="unified-chip-count">{chipCount(k as SectionKey)}</span>}
                      </button>
                    ))}
                </div>
              )}
              {visible.map((s) => (
                <section key={s.key} className={`unified-section unified-section-${s.key}`} aria-label={s.label}>
                  <div className="unified-section-head">
                    <span className="unified-section-icon" aria-hidden="true">
                      <Icon name={s.icon} />
                    </span>
                    <span className="unified-section-title">{s.label}</span>
                    <span className="bible-search-results-count">{s.countLabel}</span>
                  </div>
                  <ul className="unified-list">
                    {s.rows.map(renderRow)}
                    {s.moreRow && renderRow(s.moreRow)}
                  </ul>
                </section>
              ))}
              {(pending || scriptureLoading || !mod) && !nothing && (
                <p className="unified-status">Searching…</p>
              )}
              {scriptureError && <p className="unified-status">Scripture search is unavailable right now.</p>}
              {nothing && (
                <p className="unified-empty">
                  Nothing found for &ldquo;{q}&rdquo;. Try a single word, a name like Paul or Jerusalem, or a reference like John 3:16.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
