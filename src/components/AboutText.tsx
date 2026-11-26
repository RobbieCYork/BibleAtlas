import type { AboutContent } from "../lib/aboutContent";

/** The words of About Capstone Bible, drawn as plain text — React text nodes only, no markup path.
 * Shared by AboutView (readers) and the Admin Console's About page preview, so the preview is exactly
 * what readers will see. The public /about page is drawn by scripts/seo/render.mjs in the same order. */
export default function AboutText({ content }: { content: AboutContent }) {
  return (
    <>
      {content.quote.trim() && <blockquote className="about-quote">{content.quote}</blockquote>}
      {content.sections.map((section, i) => (
        <section key={i}>
          {section.heading && <h3>{section.heading}</h3>}
          {section.paragraphs.map((text, j) => (
            <p key={j}>{text}</p>
          ))}
        </section>
      ))}
    </>
  );
}
