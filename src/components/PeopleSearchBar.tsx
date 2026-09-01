import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

interface PersonMatch {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface PeopleSearchBarProps {
  /** The signed-in account — filtered out of its own results, which are never useful. */
  viewerId: string;
  onSelect: (personId: string) => void;
}

/** Header search bar for My Profile mode — searches PEOPLE, not Scripture.
 *
 * My Profile is a full-area takeover that leaves the panels underneath mounted, so before this
 * existed the header fell through to whichever panel was last active and painted Bible's "Search
 * Scripture…" (or Map's/Notes') bar over a profile page it had nothing to do with — the same
 * class of leak Games had. Rather than just blanking the header there, this gives the profile the
 * search it should always have had.
 *
 * Deliberately reuses the same `find_users_by_display_name` RPC the Friends panel's "Search People"
 * form already calls, so discovery stays governed by exactly one rule in exactly one place: the
 * profiles.discoverable_by_name opt-in ("Let people find me by searching my name" in the profile
 * editor). Nothing here can surface someone who hasn't opted in, and no new query or policy was
 * added to make this work.
 *
 * Same dropdown-as-you-type idiom (`.search-bar` / `.search-results`) as SearchBar and
 * TimelineSearchBar, but the results come from the network, so the query is debounced and each
 * in-flight request is tagged so a slow early response can't overwrite a fast later one.
 */
export default function PeopleSearchBar({ viewerId, onSelect }: PeopleSearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PersonMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("find_users_by_display_name", { query: q });
      // A response from a query the reader has already typed past is stale — drop it.
      if (id !== requestId.current) return;
      const rows = (data as PersonMatch[] | null) ?? [];
      setResults(rows.filter((r) => r.id !== viewerId));
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, viewerId]);

  const handleSelect = (person: PersonMatch) => {
    onSelect(person.id);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">
        🧑‍🤝‍🧑
      </span>
      <input
        type="text"
        placeholder="Search people"
        aria-label="Search people"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && query.trim().length >= 2 && (
        <ul className="search-results">
          {searching ? (
            <li className="search-results-empty">Searching…</li>
          ) : results.length > 0 ? (
            results.map((p) => (
              <li key={p.id} className="people-search-result" onMouseDown={() => handleSelect(p)}>
                <span className="auth-avatar" aria-hidden="true">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" /> : p.display_name.charAt(0).toUpperCase()}
                </span>
                <span className="search-result-name">{p.display_name}</span>
              </li>
            ))
          ) : (
            <li className="search-results-empty">No one found by that name</li>
          )}
        </ul>
      )}
    </div>
  );
}
