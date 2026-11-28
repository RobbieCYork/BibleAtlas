import type { ReactNode } from "react";

/**
 * The two named main sections every article shares (Robbie, 2026-11-28). Their headings are styled
 * the same as the other main section headings (Bible References, Sources). Headings written inside
 * "Dig Deeper" are `h5`, one level down, and App.css draws them as subsections of it.
 *
 * The public pages build the same two sections in scripts/seo/render.mjs.
 */

/** The short lead summary under an article's title. */
export function Snapshot({ children }: { children: ReactNode }) {
  return (
    <section className="article-main-section article-snapshot">
      <h4>Snapshot</h4>
      {children}
    </section>
  );
}

/** The long-form body. It ends at the next main section (evidence, references, sources, related
 * articles) or at the "mark as read" control. Render it only for an article that has a body. */
export function DigDeeper({ children }: { children: ReactNode }) {
  return (
    <section className="article-main-section article-dig-deeper">
      <h4>Dig Deeper</h4>
      {children}
    </section>
  );
}
