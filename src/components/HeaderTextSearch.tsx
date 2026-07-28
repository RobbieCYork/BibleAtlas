interface HeaderTextSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Only Bible search needs this — it hits an external API, so it waits for Enter instead of
   * searching on every keystroke. Notes search omits this and just filters live via `value`. */
  onSubmit?: () => void;
}

/** Simple text input reusing `.search-bar`'s styling (no autocomplete dropdown) — the header's
 * stand-in for SearchBar (which is Map-specific) while Bible or Notes is the active panel. */
export default function HeaderTextSearch({ placeholder, value, onChange, onSubmit }: HeaderTextSearchProps) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) onSubmit();
        }}
      />
    </div>
  );
}
