import { useLayoutEffect, useRef, useState } from "react";
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
  /** The unwritten remainder of what the reader appears to be typing, drawn in grey immediately
   * after the cursor — "hew 1" while they have "Matt" in the box. Bible search supplies this from
   * lib/bibleReference; Notes search leaves it undefined and gets the plain input it always had.
   *
   * It is NOT part of the field's value and never becomes part of it by accident: the input's own
   * value is untouched, so paste, backspace, selection and a phone's autocorrect all behave exactly
   * as they do in a bare input, and a submit sends what was typed, never what was suggested. */
  completion?: string;
  /** Take the suggestion. Called for → at the end of the line and for a tap on the grey text
   * itself; Enter goes through onSubmit instead, which resolves the same reference. */
  onAcceptCompletion?: () => void;
}

/** Simple text input reusing `.search-bar`'s styling (no autocomplete dropdown) — the header's
 * stand-in for SearchBar (which is Map-specific) while Bible or Notes is the active panel.
 *
 * HOW THE GREY TEXT IS DRAWN. A second element sits exactly behind the input, holding the reader's
 * own text in transparent ink followed by the suggested remainder in grey. The transparent copy is
 * what does the work — it takes up precisely the width of what has been typed, in the same font at
 * the same size, so the grey tail lands at the cursor without anyone measuring anything. The real
 * text the reader sees is still the input's, painted on top.
 *
 * That is also why the ghost is not a `placeholder` and not a value: a placeholder cannot start
 * partway along a line, and writing the suggestion into the value would put words in the reader's
 * mouth on the next keystroke, paste or submit.
 */
export default function HeaderTextSearch({
  placeholder,
  icon,
  value,
  onChange,
  onSubmit,
  completion,
  onAcceptCompletion,
}: HeaderTextSearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The ghost is one line of unscrollable text behind a field that scrolls. Once the reader has
  // typed past the right-hand edge the input slides its own text left and the two stop agreeing, so
  // the suggestion is dropped rather than shown in the wrong place. References are short; in
  // practice this only fires for a long word search, which has no suggestion anyway.
  const [fieldScrolled, setFieldScrolled] = useState(false);
  useLayoutEffect(() => {
    setFieldScrolled((inputRef.current?.scrollLeft ?? 0) > 0);
  }, [value, completion]);

  const showCompletion = !!completion && !fieldScrolled;

  const accept = () => {
    inputRef.current?.focus();
    onAcceptCompletion?.();
  };

  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      {showCompletion && (
        <div className="search-bar-ghost" aria-hidden="true">
          <span className="search-bar-ghost-typed">{value}</span>
          {/* Tappable, because on a phone the grey text is the affordance and → is not available.
              preventDefault keeps the press from moving the caret before the value is replaced. */}
          <span
            className="search-bar-ghost-rest"
            onPointerDown={(e) => {
              e.preventDefault();
              accept();
            }}
          >
            {completion}
          </span>
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        // Tells a screen reader that a completion may be offered inline, which is the one thing the
        // decorative ghost above cannot say for itself.
        aria-autocomplete={onAcceptCompletion ? "inline" : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            onSubmit();
            return;
          }
          // Only at the very end of the line, and only with nothing selected — anywhere else → is
          // still just "move the cursor right", which is what it has to stay.
          if (
            e.key === "ArrowRight" &&
            showCompletion &&
            onAcceptCompletion &&
            e.currentTarget.selectionStart === value.length &&
            e.currentTarget.selectionEnd === value.length
          ) {
            e.preventDefault();
            onAcceptCompletion();
          }
        }}
      />
    </div>
  );
}
