import type { ReactNode } from "react";
import BackButton from "./BackButton";
import CloseButton from "./CloseButton";

interface ArticleHeaderProps {
  title: string;
  /** The short descriptor that used to be a full-width pill above the title (a person's role, a
   * place's category, an event's era). Rendered as one small muted line under the title. */
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  /** Extra icon-sized controls for the end slot, e.g. the Share button. Rendered before Close. */
  actions?: ReactNode;
  /** Number of controls in `actions`, so both side slots can be sized equally (keeps the title
   * truly centred). */
  actionCount?: number;
}

/** The ONE header row shared by every details article: Back (icon-only) at the start, the title
 * centred, and the end controls (Share, Close) at the end — with the subtitle tucked directly under
 * the title. Replaces the old stack of Back row / badge row / title, which cost ~110px of vertical
 * space before the first line of body text on a phone.
 *
 * Both side slots are the same width (44px per control, whichever side has more), so the title is
 * centred on the row rather than on whatever space the buttons leave over. DOM order is Back, title,
 * subtitle, end controls — the same order a reader hears and tabs in. */
export default function ArticleHeader({
  title,
  subtitle,
  onBack,
  onClose,
  actions,
  actionCount = 0,
}: ArticleHeaderProps) {
  const endCount = actionCount + (onClose ? 1 : 0);
  const slots = Math.max(onBack ? 1 : 0, endCount);
  return (
    <header className="article-head" style={{ ["--ah-side" as string]: `${slots * 44}px` }}>
      <div className="article-head-start">{onBack && <BackButton onClick={onBack} iconOnly />}</div>
      <div className="article-head-title">
        <h2>{title}</h2>
        {subtitle && (
          <p className="article-head-sub" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="article-head-end">
        {actions}
        {onClose && <CloseButton onClick={onClose} ariaLabel="Close article" iconOnly />}
      </div>
    </header>
  );
}
