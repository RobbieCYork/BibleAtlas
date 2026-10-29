import { setArticleRead, useArticleRead, type ArticleKind } from "../lib/articleReads";

interface ArticleReadProps {
  kind: ArticleKind;
  id: string | null | undefined;
}

/** "Mark this article as read" — sits at the foot of every article, as BiblePanel's
 * "Mark <chapter> as read" sits at the foot of every chapter, and wears the same class so it looks
 * the same. Renders nothing without a session (or before the account's marks are known, or while
 * sql/041 is unapplied) — see lib/articleReads.ts. */
export function ArticleReadToggle({ kind, id }: ArticleReadProps) {
  const { available, read } = useArticleRead(kind, id);
  if (!available || !id) return null;
  return (
    <label className="bible-mark-read article-mark-read no-print">
      <input type="checkbox" checked={read} onChange={() => void setArticleRead(kind, id, !read)} />
      Mark this article as read
    </label>
  );
}

/** The small ✓ beside an article's heading, present only while the article is marked read — the
 * article twin of `.bible-passage-title-check` on the chapter chip. Goes INSIDE the heading element,
 * after the title text; the visible check is aria-hidden and screen readers hear ", read" instead. */
export function ArticleReadCheck({ kind, id }: ArticleReadProps) {
  const { read } = useArticleRead(kind, id);
  if (!read) return null;
  return (
    <>
      {" "}
      <span className="article-title-check" aria-hidden="true" title="Read">
        ✓
      </span>
      <span className="sr-only">, read</span>
    </>
  );
}
