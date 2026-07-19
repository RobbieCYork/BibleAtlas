import { useMemo, useState } from "react";
import type { Location } from "../data/types";

interface SearchBarProps {
  locations: Location[];
  onSelect: (id: string) => void;
}

export default function SearchBar({ locations, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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
      <input
        type="text"
        placeholder="Search a New Testament location (e.g. Capernaum, Galilee)…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((loc) => (
            <li key={loc.id} onMouseDown={() => handleSelect(loc.id)}>
              <span className="search-result-name">{loc.name}</span>
              <span className="search-result-category">{loc.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
