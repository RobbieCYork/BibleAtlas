import { useMemo, useState } from "react";
import type { TimelineEvent } from "../data/types";

interface TimelineSearchBarProps {
  events: TimelineEvent[];
  onSelect: (id: string) => void;
}

/** Header search bar for Timeline mode — same dropdown-as-you-type idiom as the Map's SearchBar
 * (`.search-bar` / `.search-results`), but matching timeline events instead of locations. Query/open
 * state is kept purely local (like SearchBar) rather than lifted into App state: this component only
 * ever mounts while Timeline mode is the active search target, so it naturally resets whenever the
 * reader leaves Timeline mode and re-enters. */
export default function TimelineSearchBar({ events, onSelect }: TimelineSearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return events
      .filter((e) => {
        return (
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.era.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [query, events]);

  const handleSelect = (e: TimelineEvent) => {
    onSelect(e.id);
    setOpen(false);
    setQuery(e.title);
  };

  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">
        ⏳
      </span>
      <input
        type="text"
        placeholder="Search timeline"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && query.trim() !== "" && (
        <ul className="search-results">
          {results.length > 0 ? (
            results.map((e) => (
              <li key={e.id} onMouseDown={() => handleSelect(e)}>
                <span className="search-result-name">{e.title}</span>
                <span className="search-result-category">{e.dateLabel}</span>
              </li>
            ))
          ) : (
            <li className="search-results-empty">No results found</li>
          )}
        </ul>
      )}
    </div>
  );
}
