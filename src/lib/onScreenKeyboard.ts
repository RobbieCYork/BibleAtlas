/* ============================================================================
 * Keeping a bottom sheet usable around the on-screen keyboard.
 *
 * Measured in the installed iPhone home-screen app (iOS 27.2): the keyboard covers the bottom ~400px
 * and nothing in the layout moves (see viewportHeight.ts, which holds the shell still on purpose), so
 * a sheet pinned to the bottom ends up entirely underneath it. And when a TAP lands on a field the
 * keyboard is about to cover, iOS scrolls the whole app up to reveal it, taking the header off the
 * screen. So two things are needed, both here:
 *
 *   1. Focus the tapped field ourselves with `preventScroll`, which opens the keyboard and leaves the
 *      page where it is.
 *   2. Lift the sheet by however much of its panel the keyboard covers, read from `visualViewport`.
 * ========================================================================== */

/** Whether focusing a text field here is likely to cover part of the screen with a keyboard. False
 * for a mouse-and-keyboard device, where focusing a field costs nothing. */
export function opensOnScreenKeyboard(): boolean {
  return !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Smaller covered strips than this are browser chrome or rounding, not a keyboard. */
const KEYBOARD_MIN_PX = 60;
/** Room left above a lifted sheet for the text it is about: about two lines. */
const CONTEXT_PX = 96;
/** The least a lifted sheet may be: its action row plus the note box and Save. */
const MIN_SHEET_PX = 120;
/** A touch that travels further than this was a scroll, not a tap. */
const TAP_SLOP_PX = 10;

const TEXT_FIELD = 'textarea, input:not([type]), input[type="text"], input[type="search"]';

function textField(target: EventTarget | null): HTMLTextAreaElement | HTMLInputElement | null {
  if (!(target instanceof Element) || !target.matches(TEXT_FIELD)) return null;
  const field = target as HTMLTextAreaElement | HTMLInputElement;
  return field.disabled || field.readOnly ? null : field;
}

/** The lowest y (in getBoundingClientRect coordinates) that the keyboard leaves uncovered. `scrollY`
 * is zero in this app (the body is fixed) except when iOS has scrolled the standalone web app to
 * reveal a field, where `offsetTop` includes that scroll and has to have it taken back out. */
function visibleBottom(vv: VisualViewport): number {
  return vv.offsetTop + vv.height - window.scrollY;
}

/**
 * Attaches both behaviours to `sheet`, which must be positioned `absolute; bottom: 0` inside its
 * parent. `onLayout` runs on attach and again whenever the lift or the sheet's height changes (a note
 * box growing a line), so the caller can keep the text the sheet is about in view. Returns a cleanup.
 */
export function keepSheetAboveKeyboard(
  sheet: HTMLElement,
  onLayout: (lifted: boolean, sheetHeight: number) => void
): () => void {
  const vv = window.visualViewport;
  const panel = sheet.parentElement;
  let applied = 0;
  let reported = "";

  const update = () => {
    const active = textField(document.activeElement);
    const focused = active && sheet.contains(active) ? active : null;
    let lift = 0;
    let maxHeight = 0;
    if (vv && panel && focused && Math.abs(vv.scale - 1) < 0.01) {
      const box = panel.getBoundingClientRect();
      const bottom = visibleBottom(vv);
      const covered = box.bottom - bottom;
      if (covered > KEYBOARD_MIN_PX) {
        lift = Math.round(covered);
        const room = bottom - Math.max(box.top, 0);
        maxHeight = Math.round(Math.max(room - CONTEXT_PX, Math.min(room, MIN_SHEET_PX)));
      }
    }
    applied = lift;
    sheet.style.bottom = lift ? `${lift}px` : "";
    sheet.style.maxHeight = lift ? `${maxHeight}px` : "";
    if (lift) sheet.dataset.keyboard = "up";
    else delete sheet.dataset.keyboard;
    if (lift && focused) {
      // Scroll the sheet itself so the field and the buttons that go with it are both showing.
      const group = focused.closest("form, .verse-popup-note-editor, .verse-popup-note-item, .tag-picker-new") ?? focused;
      const s = sheet.getBoundingClientRect();
      const below = group.getBoundingClientRect().bottom - (s.bottom - 8);
      const spare = focused.getBoundingClientRect().top - (s.top + 8);
      if (below > 0 && spare > 0) sheet.scrollTop += Math.min(below, spare);
    }
    const height = sheet.offsetHeight;
    const state = `${lift}:${height}`;
    if (state === reported) return;
    reported = state;
    onLayout(lift > 0, height);
  };

  // iOS reports the keyboard late and in steps, and not always with an event for the last one. Never
  // measured on the spot: a field losing focus is often a finger landing on something else in the
  // sheet, and moving the sheet before that tap has finished makes it miss.
  const timers: number[] = [];
  const settle = () => {
    for (const delay of [100, 350, 800]) timers.push(window.setTimeout(update, delay));
  };

  // While the sheet is lifted, its buttons must not take focus from the field: the keyboard would
  // drop, and the sheet with it, out from under the finger.
  const onMouseDown = (e: MouseEvent) => {
    if (applied > 0 && e.target instanceof Element && e.target.closest("button")) e.preventDefault();
  };

  let start: { x: number; y: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const field = textField(e.target);
    const from = start;
    start = null;
    if (!field || !from || !vv || !e.cancelable) return;
    const end = e.changedTouches[0];
    if (Math.hypot(end.clientX - from.x, end.clientY - from.y) > TAP_SLOP_PX) return;
    // With the keyboard already up for this field, a tap is the reader placing the caret: leave it.
    const keyboardUp = window.innerHeight - vv.height > KEYBOARD_MIN_PX || applied > 0;
    if (document.activeElement === field && keyboardUp) return;
    e.preventDefault();
    // A field can keep focus after its keyboard is put away, and refocusing it then does nothing.
    if (document.activeElement === field) field.blur();
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  };

  sheet.addEventListener("touchstart", onTouchStart, { passive: true });
  sheet.addEventListener("touchend", onTouchEnd);
  sheet.addEventListener("mousedown", onMouseDown);
  sheet.addEventListener("focusin", settle);
  sheet.addEventListener("focusout", settle);
  vv?.addEventListener("resize", update);
  vv?.addEventListener("scroll", update);
  const resized = new ResizeObserver(update);
  resized.observe(sheet);
  update();

  return () => {
    timers.forEach((t) => window.clearTimeout(t));
    resized.disconnect();
    sheet.removeEventListener("touchstart", onTouchStart);
    sheet.removeEventListener("touchend", onTouchEnd);
    sheet.removeEventListener("mousedown", onMouseDown);
    sheet.removeEventListener("focusin", settle);
    sheet.removeEventListener("focusout", settle);
    vv?.removeEventListener("resize", update);
    vv?.removeEventListener("scroll", update);
  };
}
