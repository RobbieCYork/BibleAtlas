import { useEffect, useMemo, useState } from "react";
import type { Location } from "../data/types";
import Icon from "./Icon";

interface SearchBarProps {
  locations: Location[];
  onSelect: (id: string) => void;
  /** Name of the location currently selected on the map (null when nothing is selected), so the
   * visible text stays in sync when the selection changes outside this input — pin clicks, Bible
   * verse links, and "Show All Pins" all change the selection without typing here. */
  selectedLocationName: string | null;
}

export default function SearchBar({ locations, onSelect, selectedLocationName }: SearchBarProps) {
  const [query, setQuery] = useState(selectedLocationName ?? "");
  const [open, setOpen] = useState(false);

  // Keep the visible text in lockstep with the map/panel selection — without this, a place name
  // picked several navigations ago lingers here as stale text with no hint it no longer matches
  // what the map is showing.
  useEffect(() => {
    setQuery(selectedLocationName ?? "");
    setOpen(false);
  }, [selectedLocationName]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return locations
      .filter((loc) => {
        const names = [loc.name, ...(loc.alternateNames ?? [])].map((n) => n.toLowerCase());
        return names.some((n) => n.includes(q));
      })
      .slice(0, 8);
  }, [query, locations]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    const loc = locations.find((l) => l.id === id);
    setQuery(loc?.name ?? "");
  };

  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">
        <Icon name="map" />
      </span>
      <input
        type="text"
        placeholder="Search places…"
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
            results.map((loc) => (
              <li key={loc.id} onMouseDown={() => handleSelect(loc.id)}>
                <span className="search-result-name">{loc.name}</span>
                <span className="search-result-category">{loc.category}</span>
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
