import { useRef, useState } from "react";
import Icon from "../Icon";
import { CERTAINTY_LABEL, searchPlaces, type PlaceKey } from "../../lib/customMap/places";

export default function PlaceSearch({
  added,
  journey,
  full,
  onAdd,
}: {
  added: PlaceKey[];
  journey: boolean;
  full: boolean;
  onAdd: (key: PlaceKey) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchPlaces(query);
  const nameCount = new Map<string, number>();
  for (const r of results) nameCount.set(r.name, (nameCount.get(r.name) ?? 0) + 1);

  // On a journey a place can come round again, just not twice in a row.
  const blocked = (key: PlaceKey) => full || (journey ? added[added.length - 1] === key : added.includes(key));
  const add = (key: PlaceKey) => {
    if (blocked(key)) return;
    onAdd(key);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="cm-search">
      <div className="cm-search-box">
        <Icon name="search" inline />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search places, e.g. Bethlehem"
          aria-label="Search places to add"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
            if (e.key !== "Enter") return;
            const first = results.find((r) => !blocked(r.key));
            if (first) add(first.key);
          }}
        />
        {query && (
          <button type="button" className="cm-search-clear" aria-label="Clear search" onClick={() => setQuery("")}>
            <Icon name="close" inline />
          </button>
        )}
      </div>
      {query.trim() && (
        <ul className="cm-results" aria-label="Matching places">
          {results.length === 0 && (
            <li className="cm-results-empty">
              No place in the app matches “{query.trim()}”. Only places the app has can be pinned.
            </li>
          )}
          {results.map((r) => {
            const here = added.includes(r.key);
            return (
              <li key={r.key}>
                <button type="button" className="cm-result" disabled={blocked(r.key)} onClick={() => add(r.key)}>
                  <span className="cm-result-name">
                    {r.name}
                    {(nameCount.get(r.name) ?? 0) > 1 && <span className="cm-chip">Shared name: check which</span>}
                    {r.certainty && <span className={`cm-chip cm-chip-${r.certainty.level}`}>{CERTAINTY_LABEL[r.certainty.level]}</span>}
                  </span>
                  <span className="cm-result-detail">{r.detail}</span>
                  <span className="cm-result-action">{here ? (blocked(r.key) ? "Added" : "Add again") : "Add"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
