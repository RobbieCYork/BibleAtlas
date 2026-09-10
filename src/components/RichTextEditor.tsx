import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { NOTE_COLORS, isHtmlEmpty, sanitizeNoteHtml, type NoteColorId } from "../lib/richText";

interface RichTextEditorProps {
  /** Initial HTML. Read ONCE, at mount — see the uncontrolled note below. To load a different
   * document, give the element a different `key` so React mounts a fresh one. */
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

/** The commands this editor issues, and the state it reads back for the pressed look. */
const INLINE_COMMANDS = ["bold", "italic", "underline"] as const;
const LIST_COMMANDS = ["insertUnorderedList", "insertOrderedList"] as const;

/* ============================================================================
 * The formatting editor behind Sermon Notes.
 *
 * ── WHY contenteditable + execCommand ──────────────────────────────────────
 * `document.execCommand` is deprecated on paper and universally implemented in practice; no engine
 * has removed it and none has shipped a replacement. What it buys here is everything that makes
 * typing on a phone bearable and that a hand-rolled editor gets wrong: the platform's own selection
 * handles, autocorrect and dictation, and — the big one — NATIVE UNDO. execCommand's edits go on
 * the browser's own undo stack, so ⌘Z and the iOS shake-to-undo keep working across formatting
 * changes. Rebuilding that on top of manual Range surgery is a large amount of code whose failure
 * mode is a lost sermon.
 *
 * The deprecation risk is contained by the storage format: what is saved is a small, allowlisted
 * HTML document (see lib/richText.ts), not an execCommand transcript. If this editor is ever
 * replaced, the notes do not have to be.
 *
 * ── WHY IT IS UNCONTROLLED, AND WHY REACT IS KEPT OUT OF THE NODE ──────────
 * A controlled contenteditable — one whose innerHTML is written on every render from state — puts
 * the caret back at the start on every keystroke. So `initialHtml` is read once at mount and the
 * element owns its own DOM from then on, reporting changes upward through `onChange`. The parent
 * remounts it (via `key`) when it genuinely means to load a different note.
 *
 * The content is written by the layout effect below and NOT through `dangerouslySetInnerHTML`.
 * That distinction is load-bearing and was found the hard way: with `dangerouslySetInnerHTML`,
 * React still considers the node's children its own, and the next re-render — which arrives on
 * every keystroke, because onChange lifts the HTML into the parent's state — restores the string
 * from mount and throws away everything typed since. It survives a synchronous test and destroys
 * a real sermon note as soon as React gets a chance to flush. Rendering the div with NO children
 * prop leaves React nothing to reconcile, which is the only version of this that is safe.
 *
 * ── WHY THE HTML IS SANITISED HERE TOO ─────────────────────────────────────
 * The parent already sanitises. This sanitises again on the way in, because the component sets
 * innerHTML and should be safe to hand any string — a caller that forgets is a bug, not a hole.
 * ==========================================================================*/
export default function RichTextEditor({ initialHtml, onChange, placeholder, ariaLabel, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  /** Frozen at mount so a later render can never rewrite the element's contents underneath the
   * caret. `useState` with an initialiser, not `useMemo`, because this must NOT recompute. */
  const [mountHtml] = useState(() => sanitizeNoteHtml(initialHtml));
  const [empty, setEmpty] = useState(() => isHtmlEmpty(initialHtml));
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [colorOpen, setColorOpen] = useState(false);
  /** The last selection that was genuinely inside the editor. Tapping a toolbar button can drop
   * the selection on touch platforms even with the mousedown default prevented, so every command
   * restores this first. Without it, the first tap after the keyboard opens does nothing. */
  const savedRange = useRef<Range | null>(null);

  /** Writes the starting document in once, directly. See the block comment above: this is
   * deliberately not `dangerouslySetInnerHTML`. Layout effect rather than `useEffect` so the text
   * is in place before the browser paints and the note never flashes empty on open. */
  useLayoutEffect(() => {
    if (ref.current) ref.current.innerHTML = mountHtml;
  }, [mountHtml]);

  const rememberSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (ref.current?.contains(range.commonAncestorContainer)) savedRange.current = range.cloneRange();
  }, []);

  const refreshActive = useCallback(() => {
    if (!ref.current) return;
    const next: Record<string, boolean> = {};
    [...INLINE_COMMANDS, ...LIST_COMMANDS].forEach((cmd) => {
      try {
        next[cmd] = document.queryCommandState(cmd);
      } catch {
        // queryCommandState throws in some engines when the selection is outside any editable
        // host. The toolbar simply shows nothing pressed, which is the honest answer.
        next[cmd] = false;
      }
    });
    setActive(next);
  }, []);

  // Only while this editor holds the selection — `selectionchange` is a document-level event and
  // fires for every caret move anywhere in the app.
  useEffect(() => {
    const handle = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      if (!ref.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
      rememberSelection();
      refreshActive();
    };
    document.addEventListener("selectionchange", handle);
    return () => document.removeEventListener("selectionchange", handle);
  }, [rememberSelection, refreshActive]);

  const emit = useCallback(() => {
    const html = ref.current?.innerHTML ?? "";
    setEmpty(isHtmlEmpty(html));
    onChange(html);
  }, [onChange]);

  const exec = useCallback(
    (command: string, value?: string) => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (sel && savedRange.current && (sel.rangeCount === 0 || !el.contains(sel.getRangeAt(0).commonAncestorContainer))) {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
      try {
        // `false` = emit tags (<b>, <i>, <u>, <blockquote>) rather than inline styles. Tags are
        // what the allowlist in richText.ts keeps; inline styles would be stripped on save and the
        // formatting would silently vanish. Colour is the one exception and is handled by mapping
        // whatever the browser produced back to a palette class — see normalizeColors().
        document.execCommand("styleWithCSS", false, "false");
      } catch {
        /* Not supported everywhere; the command below still works. */
      }
      document.execCommand(command, false, value);
      rememberSelection();
      emit();
      refreshActive();
    },
    [emit, refreshActive, rememberSelection]
  );

  const applyColor = (id: NoteColorId) => {
    const entry = NOTE_COLORS.find((c) => c.id === id);
    if (!entry) return;
    // Hand the browser the value for the CURRENT theme, so the text the writer sees while typing is
    // already the colour it will be after save. normalizeColors() maps both themes' values to the
    // same class, so a note coloured in dark mode reads correctly in light mode and vice versa.
    const dark = document.documentElement.getAttribute("data-theme") !== "light";
    exec("foreColor", dark ? entry.dark : entry.light);
    setColorOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    const command = key === "b" ? "bold" : key === "i" ? "italic" : key === "u" ? "underline" : null;
    if (!command) return;
    // Most engines already handle these inside a contenteditable, but not all of them, and those
    // that do can apply a different markup than styleWithCSS(false) asks for. Taking the event
    // means exactly one code path produces exactly one kind of tag.
    e.preventDefault();
    exec(command);
  };

  /** Strips formatting from anything pasted in. A sermon note pasted from a church bulletin or
   * another app otherwise arrives carrying that document's fonts, sizes and colours — none of
   * which survive the allowlist, so what the writer sees on paste would not be what is saved.
   * Inserting the plain text keeps paste honest and keeps the note in this app's own type. */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    document.execCommand("insertText", false, text);
    rememberSelection();
    emit();
  };

  const button = (key: string, label: string, icon: Parameters<typeof Icon>[0]["name"], onPress: () => void, pressed?: boolean) => (
    <button
      key={key}
      type="button"
      className={`rte-tool ${pressed ? "rte-tool-active" : ""}`}
      // Keeps the caret where it is: the default action of mousedown on a button moves focus out
      // of the editable host, which collapses the selection the command is about to act on.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      <Icon name={icon} inline />
    </button>
  );

  return (
    <div className={`rte ${className ?? ""}`}>
      <div className="rte-toolbar no-print" role="toolbar" aria-label="Text formatting">
        {button("bold", "Bold", "formatBold", () => exec("bold"), active.bold)}
        {button("italic", "Italic", "formatItalic", () => exec("italic"), active.italic)}
        {button("underline", "Underline", "formatUnderline", () => exec("underline"), active.underline)}
        <span className="rte-tool-divider" aria-hidden="true" />
        {button("ul", "Bulleted list", "listBullet", () => exec("insertUnorderedList"), active.insertUnorderedList)}
        {button("ol", "Numbered list", "listNumbered", () => exec("insertOrderedList"), active.insertOrderedList)}
        <span className="rte-tool-divider" aria-hidden="true" />
        {button("outdent", "Decrease indent", "outdent", () => exec("outdent"))}
        {button("indent", "Increase indent", "indent", () => exec("indent"))}
        <span className="rte-tool-divider" aria-hidden="true" />
        <button
          type="button"
          className={`rte-tool ${colorOpen ? "rte-tool-active" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setColorOpen((open) => !open)}
          aria-label="Text colour"
          aria-expanded={colorOpen}
          title="Text colour"
        >
          <Icon name="textColor" inline />
        </button>
      </div>

      {colorOpen && (
        <div className="rte-colors no-print" role="group" aria-label="Text colour">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rte-swatch ${c.className ? `rte-swatch-${c.id}` : "rte-swatch-default"}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyColor(c.id)}
              aria-label={c.label}
              title={c.label}
            >
              <span aria-hidden="true">A</span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={ref}
        className="rte-surface sermon-notes-body-input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-empty={empty ? "true" : undefined}
        data-placeholder={placeholder}
        onInput={emit}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onFocus={refreshActive}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
}
