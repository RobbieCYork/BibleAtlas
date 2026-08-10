/** Converts a DOM (node, offset) selection boundary into a character offset within `root`'s
 * flattened text content — stable regardless of nested elements (links, marks) inside `root`. */
export function getTextOffsetInRoot(root: Node, targetNode: Node, targetOffset: number): number {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current === targetNode) return total + targetOffset;
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return total;
}

/** The inverse of getTextOffsetInRoot: locates the (text node, offset-within-node) pair for a
 * character offset within `root`'s flattened text content. Clamps to the last text position if
 * `charOffset` runs past the end (e.g. a highlight whose stored offset is now stale). Returns null
 * only if `root` has no text nodes at all. */
export function getNodeAndOffsetForTextOffset(root: Node, charOffset: number): { node: Text; offset: number } | null {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode() as Text | null;
  let last: Text | null = null;
  while (current) {
    const len = current.textContent?.length ?? 0;
    if (charOffset <= total + len) return { node: current, offset: Math.max(0, charOffset - total) };
    total += len;
    last = current;
    current = walker.nextNode() as Text | null;
  }
  return last ? { node: last, offset: last.textContent?.length ?? 0 } : null;
}

/** A caret's on-screen position — a zero-width point at `charOffset` within `root`'s text, expressed
 * as the boundary rect's left edge and vertical center (matches where a text cursor would blink). */
export function getCaretRectForTextOffset(root: Node, charOffset: number): DOMRect | null {
  const pos = getNodeAndOffsetForTextOffset(root, charOffset);
  if (!pos) return null;
  const range = document.createRange();
  range.setStart(pos.node, pos.offset);
  range.setEnd(pos.node, pos.offset);
  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  return rect;
}

/** Best-effort reverse of a screen point to a (verse-root-relative) text offset, using whichever of
 * the two non-standard-but-universally-implemented browser APIs is available. Returns null if the
 * point doesn't land on text at all (e.g. over padding). */
export function caretPositionAtPoint(x: number, y: number): { node: Node; offset: number } | null {
  const withCaretRangeFromPoint = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (withCaretRangeFromPoint.caretRangeFromPoint) {
    const range = withCaretRangeFromPoint.caretRangeFromPoint(x, y);
    if (range) return { node: range.startContainer, offset: range.startOffset };
  }
  const withCaretPositionFromPoint = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (withCaretPositionFromPoint.caretPositionFromPoint) {
    const pos = withCaretPositionFromPoint.caretPositionFromPoint(x, y);
    if (pos) return { node: pos.offsetNode, offset: pos.offset };
  }
  return null;
}
