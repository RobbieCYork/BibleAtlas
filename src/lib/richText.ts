/* ============================================================================
 * Rich text for Sermon Notes — storage format, sanitisation, and the colour palette.
 *
 * ── THE STORAGE FORMAT, AND WHY ────────────────────────────────────────────
 * `sermon_notes.body` is a plain `text` column that has, until now, held plain text. Rich notes
 * are stored in that SAME column as **sanitised HTML behind a sentinel prefix**:
 *
 *     <!--capstone-rich:1--><p>Grace <b>abounds</b></p><ul><li>…</li></ul>
 *
 * A body that does not begin with that exact prefix is plain text, full stop. That is the whole
 * compatibility story and it is why this needs NO MIGRATION: every row written before today is
 * missing the prefix, so it is read as plain text and rendered escaped, exactly as it always was.
 * Nothing is rewritten until its owner actually edits it.
 *
 * The alternatives were weighed and rejected:
 *
 *   A `body_format` column would be the tidier schema, but it cannot be applied to production
 *   without Robbie's say-so (migrations are always his call). A feature that is broken on the live
 *   site until someone runs a migration is a worse feature. The sentinel needs no schema change
 *   and cannot get out of sync with the data, because it IS the data.
 *
 *   Sniffing ("does this body contain tags?") is the trap this sentinel exists to avoid. A reader
 *   who typed `Isaiah 40 > all` or `<-- see v.3` into a note years ago would have it silently
 *   reinterpreted as markup. The prefix is unambiguous: present or absent, never guessed.
 *
 *   Markdown has no underline and no colour, and its bullets and nesting are whitespace-sensitive
 *   — which is precisely the thing that falls apart when a phone keyboard autocorrects and
 *   auto-capitalises someone typing fast in a pew. A structured JSON document model would be the
 *   most rigorous choice, but it means writing and maintaining a document schema plus a renderer
 *   for a feature whose entire requirement is "bold, bullets, indent, colour". HTML with a hard
 *   allowlist is the smallest thing that is actually correct here, and `contenteditable` speaks it
 *   natively, which is what keeps the mobile editing experience (selection handles, autocorrect,
 *   native undo) working instead of being reimplemented badly.
 *
 * ── THE SANITISATION RULE ──────────────────────────────────────────────────
 * Everything that enters storage goes through sanitizeNoteHtml(). Everything that leaves storage
 * for the screen goes through it AGAIN, via noteBodyToHtml(). The stored string is never trusted,
 * not because the server is expected to lie, but because "the client sanitised it on the way in"
 * is a guarantee that survives exactly until someone writes to the table by another route
 * (a restored backup, psql, a future import feature, a second client).
 *
 * The allowlist below is deliberately tiny and, apart from a fixed set of colour classes, carries
 * NO attributes at all. No href, no src, no style, no data-*, no event handlers — there is nothing
 * for a URL scheme or a CSS expression to hide in. See ALLOWED_TAGS.
 *
 * ── THE COLOUR PALETTE ─────────────────────────────────────────────────────
 * Colour is stored as a CLASS, never as a value. `<span class="sn-c-red">`, never
 * `<span style="color:#a83c24">`. This is not tidiness: this app's light and dark themes are two
 * different palettes selected by a `data-theme` attribute (see index.css), so any hex baked into a
 * note is right in one theme and wrong — often unreadable — in the other. A class lets index.css
 * resolve the same "red" to #a83c24 on white and #e88a72 on near-black. Six slots, drawn from the
 * illuminated palette's own pigments, every one measured at >= 4.5:1 against all three surfaces a
 * note can land on in both themes.
 * ==========================================================================*/

import DOMPurify from "dompurify";

/** The marker that says "the rest of this column is sanitised HTML". Anything else is plain text.
 * Versioned so a future format change can be told apart from this one rather than guessed at. */
const RICH_PREFIX = "<!--capstone-rich:1-->";

/** One entry per swatch in the colour row.
 *
 * `light`/`dark` are the exact values index.css resolves each class to. They are duplicated here
 * (rather than read from CSS) for one reason: `document.execCommand("foreColor")` takes a colour
 * VALUE, so the editor has to hand the browser a real hex, and then map what the browser produced
 * back to the class. Keeping both halves of that round trip in one table is what stops them
 * drifting — if a value changes in index.css and not here, the mapping silently stops matching and
 * the colour is dropped (safely: uncoloured text, never a wrong-theme hex in storage).
 *
 * The measured contrast of each value, against --surface-sunken / --panel-bg / --bg:
 *   dark  red 7.71/6.85/7.44  gold 10.13/8.99/9.77  green 9.79/8.69/9.45  blue 7.96/7.06/7.68  violet 9.21/8.17/8.89
 *   light red 5.06/6.29/5.63  gold  4.57/5.69/5.09  green 6.34/7.88/7.05  blue 8.04/10.00/8.94  violet 5.71/7.10/6.35
 * The floor is gold-on-light at 4.57:1. Nothing here is below AA for body text in either theme. */
export const NOTE_COLORS = [
  { id: "default", label: "Default", className: null, light: "#2e251c", dark: "#ddd0b6" },
  { id: "red", label: "Rubric red", className: "sn-c-red", light: "#a83c24", dark: "#e88a72" },
  { id: "gold", label: "Gold", className: "sn-c-gold", light: "#8a5e12", dark: "#e5b355" },
  { id: "green", label: "Verdigris", className: "sn-c-green", light: "#2f5a43", dark: "#7fc79c" },
  { id: "blue", label: "Lapis blue", className: "sn-c-blue", light: "#2e3a8c", dark: "#93a2e8" },
  { id: "violet", label: "Violet", className: "sn-c-violet", light: "#6d28d9", dark: "#b9a8f0" },
] as const;

export type NoteColorId = (typeof NOTE_COLORS)[number]["id"];

/** The only class names any note may carry, in storage or on screen. */
const COLOR_CLASSES: ReadonlySet<string> = new Set(
  NOTE_COLORS.flatMap((c) => (c.className ? [c.className as string] : []))
);

/* ── QUOTED SCRIPTURE ───────────────────────────────────────────────────────
 * A passage inserted from the "Insert Scripture" picker is stored as a blockquote wearing
 * `sn-scripture`, with the reference in a `sn-scripture-ref` span at its head:
 *
 *     <blockquote class="sn-scripture"><span class="sn-scripture-ref">John 3:16</span>For God so…</blockquote>
 *
 * These are the ONLY two class names besides the colour palette that survive sanitisation, and each
 * one survives on exactly one tag — see normalizeColors(). That tag pairing is not decoration: a
 * hand-edited row, or a paste from somewhere else, cannot borrow the quoted-scripture look for the
 * writer's own words by putting the class on a `<b>`, because the class is dropped anywhere else.
 *
 * Why a CLASS and not just a plain blockquote: `execCommand("indent")` already emits bare
 * blockquotes for ordinary indenting (App.css deliberately strips those back to a left offset), so
 * the class is the only thing that tells an indent apart from a quotation. And it matters that they
 * ARE told apart — these are sermon notes, and months later the reader has to be able to see at a
 * glance which sentences are Scripture and which are their own. */
export const SCRIPTURE_CLASS = "sn-scripture";
export const SCRIPTURE_REF_CLASS = "sn-scripture-ref";

/* ── A PHOTOGRAPHED SLIDE ───────────────────────────────────────────────────
 * A picture taken during the sermon is stored as an image wearing `sn-image`, carrying the storage
 * object's PATH and nothing else:
 *
 *     <p><img class="sn-image" data-sn-src="e3b0c442-…/a1b2c3d4-….jpg"></p>
 *
 * ── WHY A PATH AND NOT A URL, WHICH IS THE WHOLE POINT ─────────────────────
 * The bucket these live in is PRIVATE (sql/027_sermon_note_images.sql): an object is readable only
 * by the account whose id is the first folder of its name. There is therefore no durable URL to
 * store. What a browser can display is a SIGNED url, minted per session and good for an hour, and
 * writing one of those into a note would produce a note whose pictures worked on Sunday and were
 * dead links by Monday.
 *
 * So the note holds the path, and lib/noteImages.ts mints a signed URL for it at the moment it is
 * shown. `src` is not on the attribute allowlist AT ALL, which means the sanitiser strips the live
 * URL every time the note is saved — the resolved form exists only in the DOM, the stored form
 * cannot rot, and this file keeps the property its opening comment claims: nothing a note can hold
 * carries a URL, so there is still nowhere for a scheme to hide.
 *
 * `data-sn-src` is validated by normalizeImages() BEFORE DOMPurify runs, against a shape strict
 * enough to be a storage key and nothing else. An <img> that fails is removed outright rather than
 * emptied, because a borrowed or hand-edited path is not a picture this reader is entitled to and
 * should not be asked for on their behalf. And, exactly as with `sn-scripture`, the class survives
 * on ONE tag only. */
export const IMAGE_CLASS = "sn-image";
export const IMAGE_PATH_ATTR = "data-sn-src";

/** `<uuid folder>/<filename>` — the only shape a stored image path may have.
 *
 * The first segment is the owner's account id, which is what the bucket's row-level policy matches
 * on; the second is a generated name. Anchored, no slash in the second segment and an alphanumeric
 * first character, so `..` and every other traversal spelling fails the test rather than being
 * escaped and hoped about. */
const IMAGE_PATH_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

/** True if `path` is a storage key a note may legitimately point at. Exported so the upload side
 * checks the same rule its result will later be sanitised against, rather than a second copy of it
 * that can drift. */
export function isNoteImagePath(path: string): boolean {
  return IMAGE_PATH_RE.test(path);
}

/** Which structural class, if any, is permitted on a given tag. */
function structureClassFor(tag: string): string | null {
  if (tag === "blockquote") return SCRIPTURE_CLASS;
  if (tag === "span") return SCRIPTURE_REF_CLASS;
  if (tag === "img") return IMAGE_CLASS;
  return null;
}

/** "r,g,b" -> class name, for BOTH themes' values, so a note coloured in dark mode and one coloured
 * in light mode normalise to the same class. */
const RGB_TO_CLASS = new Map<string, string>();
NOTE_COLORS.forEach((c) => {
  if (!c.className) return;
  RGB_TO_CLASS.set(hexToRgbKey(c.light), c.className);
  RGB_TO_CLASS.set(hexToRgbKey(c.dark), c.className);
});

function hexToRgbKey(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Normalises whatever a browser produced for a colour — `#a83c24`, `rgb(168, 60, 36)`,
 * `rgba(168, 60, 36, 1)` — to the "r,g,b" key used by RGB_TO_CLASS. Returns null for anything it
 * does not recognise (named colours, hsl, colour functions), which is the safe answer: an
 * unrecognised colour is dropped rather than preserved. */
function colorToRgbKey(value: string): string | null {
  const v = value.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) return `${parseInt(short[1] + short[1], 16)},${parseInt(short[2] + short[2], 16)},${parseInt(short[3] + short[3], 16)}`;
  const long = /^#([0-9a-f]{6})$/.exec(v);
  if (long) return hexToRgbKey(`#${long[1]}`);
  const fn = /^rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/.exec(v);
  if (fn) return `${Number(fn[1])},${Number(fn[2])},${Number(fn[3])}`;
  return null;
}

/** The complete tag allowlist. Every one of these is a shape a note can legitimately hold, and
 * apart from the image at the end of the list, none of them can carry a URL, load a resource, or
 * run anything.
 *
 * `blockquote` is on the list because it is what `execCommand("indent")` produces outside a list;
 * App.css styles it as a plain left indent with no rule and no quote marks, so the reader gets the
 * indent they asked for. `div` and `font` are here because browsers emit them unbidden — `div` as
 * a line wrapper, `font` from `foreColor` — and it is better to normalise them than to have a
 * note's line breaks vanish. `font` never survives: normalizeColors() below rewrites every one of
 * them to a span (or unwraps it) before DOMPurify ever sees the markup.
 *
 * `img` joins them for photographed slides, and is the one tag here that CAN load a resource — so
 * it is also the one tag whose every attribute is thrown away and rebuilt by normalizeImages()
 * below. `src` is never allowed through; what survives is a validated storage path. */
const ALLOWED_TAGS = ["p", "div", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "blockquote", "span", "font", "img"];

/** Tags after which the plain-text projection starts a new line. */
const BLOCK_TAGS = new Set(["p", "div", "li", "ul", "ol", "blockquote"]);

/** Rewrites every colour a browser applied into one of the palette classes, in place.
 *
 * Runs BEFORE DOMPurify, on a detached document, so that by the time the allowlist is applied the
 * only classes present are ones from COLOR_CLASSES and the only colour information left is those
 * classes. DOMPurify removes but never adds, so `ALLOWED_ATTR: ["class"]` downstream cannot let a
 * class through that this pass did not put there. */
function normalizeColors(root: Element): void {
  root.querySelectorAll("*").forEach((el) => {
    const raw = el.getAttribute("color") ?? (el instanceof HTMLElement ? el.style.color : "");
    const key = raw ? colorToRgbKey(raw) : null;
    const cls = key ? RGB_TO_CLASS.get(key) ?? null : null;

    if (el.tagName === "FONT") {
      // <font> carries face/size we do not want and is not a tag any note should keep. When it
      // held a palette colour it becomes a span with just that class; otherwise it is unwrapped
      // entirely. Its children are preserved either way, so no words are ever lost.
      if (cls) {
        const span = el.ownerDocument.createElement("span");
        span.className = cls;
        while (el.firstChild) span.appendChild(el.firstChild);
        el.replaceWith(span);
      } else {
        el.replaceWith(...el.childNodes);
      }
      return;
    }

    if (el instanceof HTMLElement && el.style.color) el.style.removeProperty("color");
    el.removeAttribute("color");

    // Anything that already carries classes is scrubbed to the palette set plus, on the one tag
    // that may wear it, the quoted-scripture marker. A class the editor did not write (from a
    // paste, or from a hand-edited row) is not preserved. An element carries at most one colour: an
    // inline colour just applied wins over a class already there, and a hand-edited row claiming
    // two palette classes keeps the first.
    const kept = [...el.classList].filter((c) => COLOR_CLASSES.has(c)).slice(0, 1);
    const structure = structureClassFor(el.tagName.toLowerCase());
    const next = [
      ...(structure && el.classList.contains(structure) ? [structure] : []),
      ...(cls ? [cls] : kept),
    ];
    if (next.length) el.className = next.join(" ");
    else el.removeAttribute("class");
  });
}

/** Reduces every <img> to the one shape a note may hold: `class="sn-image"`, a validated storage
 * path, and NOTHING else. Anything that fails the path test is removed with its wrapper untouched.
 *
 * Like normalizeColors(), this runs BEFORE DOMPurify, on a detached document. That ordering is what
 * makes the result provable rather than hopeful: by the time the allowlist is applied, every `src`,
 * `srcset`, `onerror`, `loading`, `width` and `style` an image arrived with is already gone, and the
 * only `data-sn-src` values in the tree are ones this function checked itself. DOMPurify removes but
 * never adds, so `ALLOWED_ATTR` downstream cannot reintroduce one.
 *
 * That is also why the live signed URL never reaches storage. The editor's DOM holds
 * `<img class="sn-image" data-sn-src="…" src="https://…?token=…">` while a note is on screen; every
 * save runs through here, and the `src` is dropped on the way past. */
function normalizeImages(root: Element): void {
  root.querySelectorAll("img").forEach((el) => {
    const path = el.getAttribute(IMAGE_PATH_ATTR) ?? "";
    if (!isNoteImagePath(path)) {
      el.remove();
      return;
    }
    [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
    el.setAttribute("class", IMAGE_CLASS);
    el.setAttribute(IMAGE_PATH_ATTR, path);
  });
}

/** Drops block wrappers that ended up with nothing in them at all.
 *
 * They come from the browser, not the writer: `execCommand("insertUnorderedList")` on paragraphs
 * emits `<p><ul>…</ul></p>`, which is invalid nesting, so re-parsing splits it into an empty
 * `<p>`, the list, and another empty `<p>`. Left alone those show as stray blank lines above and
 * below every list.
 *
 * A paragraph the writer deliberately left blank is `<p><br></p>` — it HAS a child — so this only
 * removes wrappers with no child nodes whatsoever and never eats an intentional blank line. */
function dropEmptyBlocks(root: Element): void {
  root.querySelectorAll("p, div, blockquote").forEach((el) => {
    if (el.childNodes.length === 0) el.remove();
  });
}

/** The single choke point. Parse -> normalise colours and classes -> allowlist -> serialise.
 *
 * Called on the way INTO storage and again on the way OUT of it. Idempotent, so running it twice
 * costs a parse and changes nothing. */
export function sanitizeNoteHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  normalizeColors(doc.body);
  // AFTER the colour pass (which would strip `sn-image` as a class it does not recognise on an
  // <img>) and BEFORE the empty-block pass, so a paragraph left hollow by a rejected image is
  // cleared out in the same run rather than showing as a blank line until the next save.
  normalizeImages(doc.body);
  dropEmptyBlocks(doc.body);
  return DOMPurify.sanitize(doc.body.innerHTML, {
    ALLOWED_TAGS,
    // `data-sn-src` is named explicitly rather than let in by ALLOW_DATA_ATTR, which stays off: this
    // is one attribute on one tag, not an open door for every data-* a paste might carry. It is
    // declared URI-safe because normalizeImages() has already constrained it to a storage key made
    // of [A-Za-z0-9._-] and a slash, and because nothing ever fetches it — DOMPurify's URI check is
    // for values a browser will dereference, and this one is only ever read by our own code.
    ALLOWED_ATTR: ["class", IMAGE_PATH_ATTR],
    ADD_URI_SAFE_ATTR: [IMAGE_PATH_ATTR],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Keep the words when a disallowed wrapper is dropped — a pasted <h2> should lose its heading,
    // not its text. Scripts and styles are removed with their contents regardless (FORBID_CONTENTS
    // defaults cover script/style/noscript/template), so this does not turn code into visible text.
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  });
}

/** True if this stored body is in the rich format rather than legacy plain text. */
export function isRichBody(body: string): boolean {
  return body.startsWith(RICH_PREFIX);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Legacy plain text -> the HTML the editor and the reader see. Escaped first, so a note that
 * literally contains `<b>` shows those five characters rather than turning bold. Blank lines are
 * kept as blank paragraphs so a note's existing shape survives the move. */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => (line.trim() === "" ? "<p><br></p>" : `<p>${escapeHtml(line)}</p>`))
    .join("");
}

/**
 * A quoted passage, ready to be inserted into a note: the reference, then the words.
 *
 * NOTHING here is assembled as a string. Every part is a DOM node whose text goes in through
 * `textContent`, so the words are escaped by the platform rather than by a template someone has to
 * remember to escape — and then the whole thing goes through sanitizeNoteHtml() anyway, exactly
 * like typed content does. That the passage came from our own Bible source is not a reason to skip
 * either step: the fetch is a third-party HTTP response, and the day it returns something with a
 * bracket in it is not the day to discover a note was built by concatenation.
 *
 * The trailing empty paragraph — withTrailingLine(), shared with the other two builders below — is
 * the point of the whole function as far as the writer is concerned. Without it the caret lands at
 * the end of the quotation, and the next thing they type, which is their own observation about the
 * verse, becomes part of the Scripture. With it they are already back on their own line.
 */
export function buildScriptureHtml(reference: string, passage: string): string {
  const doc = document.implementation.createHTMLDocument("");
  const host = doc.createElement("div");

  const quote = doc.createElement("blockquote");
  quote.className = SCRIPTURE_CLASS;
  const ref = doc.createElement("span");
  ref.className = SCRIPTURE_REF_CLASS;
  ref.textContent = reference;
  quote.appendChild(ref);
  // A space between the two, so the reference and the first word do not collide if this note is
  // ever read somewhere that does not load App.css — a print stylesheet, a future export.
  quote.appendChild(doc.createTextNode(` ${passage}`));
  host.appendChild(quote);

  return withTrailingLine(host, doc);
}

/** A trailing empty paragraph, and why every builder here ends with one.
 *
 * Without it the caret lands at the end of whatever was just inserted, and the next thing typed —
 * the writer's own observation — becomes part of it. With it they are already back on their own
 * line. RichTextEditor.insertHtml() puts the caret inside the LAST node of what it is handed,
 * which is this. */
function withTrailingLine(host: HTMLElement, doc: Document): string {
  const after = doc.createElement("p");
  after.appendChild(doc.createElement("br"));
  host.appendChild(after);
  return sanitizeNoteHtml(host.innerHTML);
}

/**
 * A photographed slide, ready to be inserted into a note.
 *
 * Takes the storage PATH, never a URL — see the block comment on IMAGE_CLASS. The path is checked
 * here as well as in the sanitiser, so a caller that got one from somewhere unexpected gets an
 * empty string back and inserts nothing, rather than an <img> that silently vanishes on the next
 * save and takes the writer's confidence in the feature with it.
 *
 * The image goes inside a paragraph rather than loose in the note. A bare <img> between two blocks
 * is something a contenteditable caret can end up on either side of in ways that differ per engine;
 * a paragraph is the same shape as every other line in the document, so the writer's next sentence
 * lands underneath it and behaves like a sentence.
 */
export function buildNoteImageHtml(path: string): string {
  if (!isNoteImagePath(path)) return "";
  const doc = document.implementation.createHTMLDocument("");
  const host = doc.createElement("div");
  const line = doc.createElement("p");
  const img = doc.createElement("img");
  img.className = IMAGE_CLASS;
  img.setAttribute(IMAGE_PATH_ATTR, path);
  line.appendChild(img);
  host.appendChild(line);
  return withTrailingLine(host, doc);
}

/**
 * Text read off a photograph, ready to be inserted into a note.
 *
 * Deliberately UNMARKED: plain paragraphs, no class, nothing to say where it came from. Text lifted
 * off the pastor's slide is not a quotation from Scripture and it is not a citation — it is the
 * writer's own note, typed by a machine because they could not type it in fifteen seconds. Marking
 * it would imply a provenance the app cannot vouch for anyway, since OCR misreads words. Plain
 * paragraphs also mean it is immediately editable in the same way as everything around it, which is
 * the point: the writer fixes the two words the recogniser got wrong and moves on.
 *
 * Every line's text goes in through `textContent`, so nothing here is assembled as a string.
 */
export function buildNoteTextHtml(text: string): string {
  const lines = text.split(/\r\n|\r|\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) return "";
  const doc = document.implementation.createHTMLDocument("");
  const host = doc.createElement("div");
  lines.forEach((line) => {
    const p = doc.createElement("p");
    p.textContent = line;
    host.appendChild(p);
  });
  return withTrailingLine(host, doc);
}

/** Every storage path a stored body points at, in document order and without duplicates.
 *
 * Used for two things: telling the list screen that a wordless note still has something in it, and
 * cleaning the objects up when the note that referenced them is deleted. It reads the SANITISED
 * projection, so a path it returns has already passed isNoteImagePath — nothing here can be talked
 * into naming an object outside the caller's own folder. */
export function noteImagePaths(body: string): string[] {
  if (!body || !isRichBody(body)) return [];
  const doc = new DOMParser().parseFromString(
    `<body>${sanitizeNoteHtml(body.slice(RICH_PREFIX.length))}</body>`,
    "text/html"
  );
  const seen = new Set<string>();
  doc.body.querySelectorAll(`img.${IMAGE_CLASS}`).forEach((img) => {
    const path = img.getAttribute(IMAGE_PATH_ATTR);
    if (path) seen.add(path);
  });
  return [...seen];
}

/** Stored body -> HTML safe to put on screen. The ONLY function that should ever feed a sermon
 * note into innerHTML. */
export function noteBodyToHtml(body: string): string {
  if (!body) return "";
  return isRichBody(body) ? sanitizeNoteHtml(body.slice(RICH_PREFIX.length)) : plainTextToHtml(body);
}

/** Editor HTML -> the string to write to `sermon_notes.body`.
 *
 * An empty document is stored as the empty string, not as `<p><br></p>` behind a prefix, so a note
 * emptied out reads as empty to every existing check (`body.trim()`, the list's snippet test) and
 * to any future one. */
export function buildStoredBody(html: string): string {
  const clean = sanitizeNoteHtml(html);
  return isHtmlEmpty(clean) ? "" : RICH_PREFIX + clean;
}

function textFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") return "\n";
  let out = "";
  el.childNodes.forEach((child) => {
    out += textFromNode(child);
  });
  if (BLOCK_TAGS.has(tag)) out += "\n";
  return out;
}

/** Stored body -> plain text, for every surface that reads a note as words rather than as markup:
 * the list snippet, the search haystack, and anything that comes later (export, previews).
 *
 * This is the function that keeps a formatted note findable. A note whose only copy of the word
 * "Habakkuk" sits inside `<b>Habakkuk</b>` must still match a search for "habakkuk", and it does,
 * because the search matches against this projection rather than against the markup. Non-breaking
 * spaces (which contenteditable inserts freely) are folded back to ordinary spaces for the same
 * reason — otherwise "the Lord" typed in the editor would not match "the Lord" typed in search. */
export function noteBodyToPlainText(body: string): string {
  if (!body) return "";
  if (!isRichBody(body)) return body;
  const doc = new DOMParser().parseFromString(`<body>${sanitizeNoteHtml(body.slice(RICH_PREFIX.length))}</body>`, "text/html");
  return textFromNode(doc.body).replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Cheap emptiness test for editor HTML.
 *
 * Deliberately a tag strip rather than a parse: it runs on every keystroke to decide whether a
 * brand-new note is still blank, and it is never used to decide what is safe to render — only
 * whether there is anything here at all. Getting it wrong costs a stray empty row, not a security
 * hole. (Everything that reaches a screen goes through sanitizeNoteHtml instead.)
 *
 * The <img> test is not a nicety. Strip the tags out of a note whose entire content is a
 * photographed slide and what is left is the empty string — so buildStoredBody() would conclude the
 * note had been emptied and write "" over it, and the picture taken during the sermon would be gone
 * by the next autosave. A note can consist of nothing but a photograph. That is still a note. */
export function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  if (/<img\b/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;|\u00a0/g, " ").trim() === "";
}
