import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type RefObject } from "react";
import Icon from "./Icon";
import { NOTE_COLORS, isHtmlEmpty, sanitizeNoteHtml, type NoteColorId } from "../lib/richText";

/** What a parent may do to the editor's contents from outside it.
 *
 * Deliberately one verb. The editor is uncontrolled precisely so nothing outside it can rewrite the
 * document under the caret (see the block comment below), and a handle that grew a `setHtml` would
 * hand that gun straight back. Inserting AT the caret is the one operation a toolbar living outside
 * this component — the "Insert Scripture" button under the notes box — genuinely needs. */
export interface RichTextEditorHandle {
  /** Drops sanitised HTML in at the caret, or at the end if the editor was never focused. */
  insertHtml: (html: string) => void;
}

interface RichTextEditorProps {
  /** Initial HTML. Read ONCE, at mount — see the uncontrolled note below. To load a different
   * document, give the element a different `key` so React mounts a fresh one. */
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  /** Filled with the handle above. A named prop rather than the component's own `ref` so it is
   * obvious at every call site that this is a content API, not the DOM node. */
  apiRef?: RefObject<RichTextEditorHandle | null>;
  /** Called with the editable node whenever something replaces or adds to its contents, so an
   * owner can give elements that store a REFERENCE rather than a value something to show — today,
   * the `sn-image` photographs, which hold a storage path and need a signed URL minted for them
   * (see lib/noteImages.ts).
   *
   * A callback rather than the editor doing it itself: this component knows about marks and carets
   * and has no business knowing about Supabase. Whatever the owner writes into the DOM is expected
   * to be something the sanitiser drops again on save; the editor goes on reporting its own
   * innerHTML upward and does not care what has been added to it. */
  onContentMounted?: (root: HTMLElement) => void;
}

/** The commands this editor issues, and the state it reads back for the pressed look. */
const INLINE_COMMANDS = ["bold", "italic", "underline"] as const;
const LIST_COMMANDS = ["insertUnorderedList", "insertOrderedList"] as const;

/** Block-level tags a caret can sit inside. Matches BLOCK_TAGS in lib/richText.ts. */
const BLOCK_TAGS = new Set(["p", "div", "li", "blockquote"]);

/** True for a block left with nothing in it by the split around an inserted passage.
 *
 * Not `childNodes.length === 0`: `extractContents()` on a range that ends exactly at a block's
 * boundary can hand back a clone holding an empty text node, which is invisible, counts as a child,
 * and shows up in the editor as a blank line nobody asked for. A `<br>` is the exception — that is
 * how a deliberately blank paragraph is written, and one is worth keeping. */
function isBlankBlock(el: Element): boolean {
  if (el.childNodes.length === 0) return true;
  if (el.querySelector("br")) return false;
  return el.textContent?.replace(/\u00a0/g, " ").trim() === "";
}

/** The block the caret is in, or null if it is loose in the editor root.
 *
 * A caret inside a list item returns the LIST, not the item. Splitting at the item would put a
 * `<blockquote>` among the `<li>`s, which is not valid anywhere; splitting at the list gives
 * bullets, then the quotation, then the remaining bullets in a list of their own — which is both
 * valid and what someone quoting a verse against a bullet point actually meant. */
function enclosingBlock(root: HTMLElement, node: Node): Element | null {
  let el: Element | null = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  while (el && el !== root && !BLOCK_TAGS.has(el.tagName.toLowerCase())) el = el.parentElement;
  if (!el || el === root) return null;
  if (el.tagName.toLowerCase() === "li") {
    let list: Element | null = el;
    while (list && list !== root && !["ul", "ol"].includes(list.tagName.toLowerCase())) list = list.parentElement;
    // Keep climbing out of nested lists so the passage lands after the outermost one.
    while (list?.parentElement && list.parentElement !== root && ["ul", "ol", "li"].includes(list.parentElement.tagName.toLowerCase())) {
      list = list.parentElement;
    }
    return list && list !== root ? list : null;
  }
  return el;
}

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
export default function RichTextEditor({
  initialHtml,
  onChange,
  placeholder,
  ariaLabel,
  className,
  apiRef,
  onContentMounted,
}: RichTextEditorProps) {
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

  /** Held in a ref, and this is not a style choice. The layout effect below is the ONE place that
   * writes innerHTML, and its dependency list must stay `[mountHtml]` — put a caller's function in
   * there and an owner who passes an inline arrow (which is every owner) re-runs it on every
   * render, rewriting the document out from under the caret. That is the exact bug the block
   * comment above is about. */
  const mounted = useRef(onContentMounted);
  mounted.current = onContentMounted;

  /** Writes the starting document in once, directly. See the block comment above: this is
   * deliberately not `dangerouslySetInnerHTML`. Layout effect rather than `useEffect` so the text
   * is in place before the browser paints and the note never flashes empty on open. */
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = mountHtml;
    mounted.current?.(ref.current);
  }, [mountHtml]);

  /** Turns OFF the drag handles Chrome and Safari put on an image inside a contenteditable.
   *
   * Not tidiness. Dragging one of those handles sets a width and a height on the <img>, and the
   * sanitiser's allowlist carries neither — so the note would resize on screen, look right for the
   * rest of the service, and come back the original size after the next save. A control that
   * appears to work and silently does not is worse than no control, and nobody needs to resize a
   * photograph of a slide in a note that already caps its height in CSS. */
  useEffect(() => {
    try {
      document.execCommand("enableObjectResizing", false, "false");
    } catch {
      /* Not implemented in every engine; where it is not, there are no handles to turn off. */
    }
  }, []);

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

  /** Every character typed also re-records where the caret now is.
   *
   * `selectionchange` alone is not enough, and the gap it leaves is not theoretical. Clicking into a
   * blank note remembers a range at offset 0 of an element with no children; the text typed next
   * arrives AT that offset, and a live range's start does not move for an insertion at exactly its
   * own offset — so the remembered caret stays pinned before everything that was written. The next
   * "Insert Scripture" then drops the passage at the top of the note instead of where the writer
   * was. Recording on input keeps the memory and the document in step keystroke by keystroke. */
  const handleInput = useCallback(() => {
    rememberSelection();
    emit();
  }, [emit, rememberSelection]);

  /** Focuses the editor and puts the caret back where the writer left it. Returns the live selection
   * so a caller can act on it.
   *
   * The ORDER here is the whole thing, and getting it wrong is a bug that looks like it works.
   * `focus()` on a contenteditable that has no selection of its own MANUFACTURES one, at offset 0.
   * So "is there already a selection inside the editor?" has to be asked BEFORE focusing — ask it
   * afterwards and the answer is always yes, the fabricated caret at the top of the note wins over
   * the remembered one, and every insertion lands above everything the writer has typed.
   *
   * Hence three cases, in order:
   *   1. The editor already had focus (a toolbar button that prevented mousedown's default, so the
   *      caret never moved) — trust the live selection, it IS the caret.
   *   2. Focus went somewhere else entirely (the Insert Scripture panel's own fields) — restore the
   *      range remembered on the last keystroke. Checked for containment first, because a remembered
   *      range can outlive the nodes it points at when a command rebuilds a block, and restoring a
   *      detached one puts the caret nowhere at all.
   *   3. Nothing remembered — the note was opened and a control used without the text ever being
   *      touched. The caret goes to the END of the document. Inserting a passage above someone's
   *      existing notes because they had not clicked into them first is not a defensible default. */
  const restoreSelection = useCallback((): Selection | null => {
    const el = ref.current;
    if (!el) return null;
    const hadFocus = el === document.activeElement || el.contains(document.activeElement);
    el.focus();
    const sel = window.getSelection();
    if (!sel) return null;
    const liveInside = sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer);
    if (hadFocus && liveInside) return sel;
    if (savedRange.current && el.contains(savedRange.current.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
      return sel;
    }
    if (liveInside) return sel;
    const end = document.createRange();
    end.selectNodeContents(el);
    end.collapse(false);
    sel.removeAllRanges();
    sel.addRange(end);
    return sel;
  }, []);

  const exec = useCallback(
    (command: string, value?: string) => {
      if (!ref.current) return;
      restoreSelection();
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
    [emit, refreshActive, rememberSelection, restoreSelection]
  );

  /** Drops a block of already-sanitised HTML in at the caret, as a SIBLING of the block the caret
   * is in — splitting that block if the caret is mid-sentence.
   *
   * ── WHY NOT execCommand("insertHTML"), when everything else here is execCommand ────────────
   * Because Chrome rewrites what it is given. Handed
   *   <blockquote class="sn-scripture"><span class="sn-scripture-ref">John 3:16</span> …</blockquote>
   * with the caret inside a paragraph, it lifts the span OUT of the blockquote and replaces its
   * class with the class's COMPUTED STYLE — `style="color: rgb(138,94,18); font-size: 0.72em; …"`.
   * Measured here, in this app, with styleWithCSS explicitly off; it is not a setting.
   *
   * That is silent data loss in this codebase specifically. The sanitiser allows a class and no
   * style attribute at all, so the quotation would look correct while it was being written and come
   * back after the next save as unstyled text with the reference orphaned outside it — a sermon
   * note that no longer shows which words were Scripture. Deterministic markup wins.
   *
   * The cost, stated plainly: this edit is not on the browser's undo stack, so ⌘Z will not lift an
   * inserted passage back out — it will step over it to whatever was typed before. Removing a wrong
   * quotation means selecting it and deleting it. That is worse than native undo would have been
   * and better than a note that quietly loses its formatting.
   *
   * The HTML is parsed through a <template>, which is inert (nothing loads, nothing runs), and the
   * string reaching it has been through sanitizeNoteHtml on the way in. */
  const insertHtml = useCallback(
    (html: string) => {
      const el = ref.current;
      if (!el) return;
      const clean = sanitizeNoteHtml(html);
      if (!clean) return;
      const sel = restoreSelection();
      if (!sel || sel.rangeCount === 0) return;

      const template = document.createElement("template");
      template.innerHTML = clean;
      const fragment = template.content;
      const last = fragment.lastChild;
      if (!last) return;

      const range = sel.getRangeAt(0);
      range.deleteContents();
      const block = enclosingBlock(el, range.startContainer);

      if (!block) {
        // The caret sits directly in the editor root (a brand-new note whose text is still a bare
        // text node). Nothing to split — the blocks go straight in.
        range.insertNode(fragment);
      } else {
        // Everything from the caret to the end of the block moves into a copy of it, which is put
        // back AFTER the inserted blocks. That is what turns "insert inside the paragraph" — which
        // would nest a blockquote inside a <p> and is not valid anywhere — into "split the
        // paragraph around it".
        const tailRange = range.cloneRange();
        tailRange.setEndAfter(block);
        const tail = tailRange.extractContents();
        block.after(tail);
        block.after(fragment);
        // A caret at the very start or very end leaves one of the two halves with nothing in it.
        // dropEmptyBlocks() would clear it on save, but not before it had shown as a blank line for
        // the rest of the service.
        if (isBlankBlock(block)) block.remove();
        const tailBlock = last.nextSibling;
        if (tailBlock && tailBlock.nodeType === Node.ELEMENT_NODE && isBlankBlock(tailBlock as Element)) {
          tailBlock.remove();
        }
      }

      // The caret goes INSIDE the trailing empty paragraph the passage carries with it, so the next
      // thing typed is the writer's own line rather than an extension of the quotation.
      const after = document.createRange();
      if (last.nodeType === Node.ELEMENT_NODE) after.setStart(last, 0);
      else after.setStartAfter(last);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);

      rememberSelection();
      emit();
      refreshActive();
      // After emit(), not before: what the owner does here (mint a signed URL for a photograph and
      // hang it on the <img>) is asynchronous and belongs to the DOM, not to the document being
      // saved. The HTML already reported upward is the storable form, and stays that way.
      mounted.current?.(el);
    },
    [emit, refreshActive, rememberSelection, restoreSelection]
  );

  useImperativeHandle(apiRef, () => ({ insertHtml }), [insertHtml]);

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
        onInput={handleInput}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onFocus={refreshActive}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
}
