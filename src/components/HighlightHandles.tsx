import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { caretPositionAtPoint, getCaretRectForTextOffset } from "../lib/domTextOffset";

/* ============================================================================
 * HighlightHandles — Kindle/iOS-style drag handles for adjusting the start and
 * end of a highlight after it's been created (or re-opened by tapping it).
 *
 * Two small knobs are portaled to <body> and positioned (fixed) at the caret
 * position for the highlight's current start/end offsets. Dragging a knob
 * tracks the pointer, resolves it back to a verse+char-offset via the browser's
 * caret-from-point APIs, and reports the live position up to the caller on
 * every move — the caller owns persisting the change (this component never
 * touches the highlight itself, only where the handles are drawn). Deliberately
 * stops a handle from crossing its opposite, stationary edge: dragging the
 * start past the end would make "start"/"end" ambiguous mid-drag.
 * ========================================================================== */

interface Pos {
  verse: number;
  offset: number;
}

interface HighlightHandlesProps {
  start: Pos;
  end: Pos;
  /** Resolves a verse number to the <span> VerseText renders its text into (see BiblePanel's
   * textRefs) — handle position and drag hit-testing both work in terms of this element. */
  getVerseTextEl: (verse: number) => HTMLElement | null;
  /** Maps a DOM (node, offset) under the pointer back to a verse+char-offset — same logic the
   * initial drag-to-select gesture uses (BiblePanel's findVerseAndOffset). */
  findVerseAndOffset: (node: Node, offset: number) => Pos | null;
  /** Fired continuously while dragging with the live (clamped) position. */
  onDragChange: (edge: "start" | "end", pos: Pos) => void;
  /** Fired once on release — the caller persists whatever position onDragChange last reported. */
  onDragEnd: () => void;
  /** The element whose scroll should reposition the handles (the Bible panel's scroll container). */
  scrollContainer: HTMLElement | null;
}

/** Where on screen a handle knob should sit, computed from a verse's text root + char offset. */
function computeAnchor(getVerseTextEl: (v: number) => HTMLElement | null, pos: Pos): { x: number; top: number; bottom: number } | null {
  const el = getVerseTextEl(pos.verse);
  if (!el) return null;
  const rect = getCaretRectForTextOffset(el, pos.offset);
  if (!rect) return null;
  return { x: rect.left, top: rect.top, bottom: rect.bottom };
}

export default function HighlightHandles({
  start,
  end,
  getVerseTextEl,
  findVerseAndOffset,
  onDragChange,
  onDragEnd,
  scrollContainer,
}: HighlightHandlesProps) {
  const [, forceRender] = useState(0);
  const draggingRef = useRef<"start" | "end" | null>(null);

  // Scroll/resize don't change `start`/`end`, so nothing else would trigger a re-render to move the
  // handles along with the text — force one directly.
  useEffect(() => {
    const reposition = () => forceRender((n) => n + 1);
    scrollContainer?.addEventListener("scroll", reposition);
    window.addEventListener("resize", reposition);
    return () => {
      scrollContainer?.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [scrollContainer]);

  useLayoutEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const edge = draggingRef.current;
      if (!edge) return;
      const caret = caretPositionAtPoint(e.clientX, e.clientY);
      if (!caret) return;
      const resolved = findVerseAndOffset(caret.node, caret.offset);
      if (!resolved) return;
      onDragChange(edge, resolved);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      onDragEnd();
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [findVerseAndOffset, onDragChange, onDragEnd]);

  const startAnchor = computeAnchor(getVerseTextEl, start);
  const endAnchor = computeAnchor(getVerseTextEl, end);
  if (!startAnchor || !endAnchor) return null;

  const startDrag = (edge: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = edge;
  };

  return createPortal(
    <>
      <div
        className="highlight-handle highlight-handle-start"
        style={{ left: startAnchor.x, top: startAnchor.top, height: startAnchor.bottom - startAnchor.top }}
        onPointerDown={startDrag("start")}
      >
        <span className="highlight-handle-knob" />
      </div>
      <div
        className="highlight-handle highlight-handle-end"
        style={{ left: endAnchor.x, top: endAnchor.top, height: endAnchor.bottom - endAnchor.top }}
        onPointerDown={startDrag("end")}
      >
        <span className="highlight-handle-knob" />
      </div>
    </>,
    document.body
  );
}
