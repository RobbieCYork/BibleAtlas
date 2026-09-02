import Icon, { type IconName } from "./Icon";

interface HeaderTextSearchProps {
  placeholder: string;
  /** Mode icon shown inside the input's left edge — the same name from the app's icon set that the
   * tab bar uses for the panel this search serves ("bible", "notes"), so the header and the tab
   * agree and both are visually distinct from the map's place search. */
  icon: IconName;
  value: string;
  onChange: (value: string) => void;
  /** Only Bible search needs this — it hits an external API, so it waits for Enter instead of
   * searching on every keystroke. Notes search omits this and just filters live via `value`. */
  onSubmit?: () => void;
}

/** Simple text input reusing `.search-bar`'s styling (no autocomplete dropdown) — the header's
 * stand-in for SearchBar (which is Map-specific) while Bible or Notes is the active panel. */
export default function HeaderTextSearch({ placeholder, icon, value, onChange, onSubmit }: HeaderTextSearchProps) {
  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
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
