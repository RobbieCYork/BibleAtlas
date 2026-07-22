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
