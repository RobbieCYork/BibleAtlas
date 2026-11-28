import type { ReactNode } from "react";
import BackButton from "./BackButton";
import { useBrowserBack, useSocialNav } from "../lib/socialNav";

/** The header of every social screen: "< Back" and the title, the same bar My Profile wears.
 * `onBack` is for a screen nested inside another (a conversation, one group) and goes up one level;
 * without it, Back leaves the social screens for wherever the reader came from. The browser's Back
 * does the same thing. */
export default function SocialHeader({
  title,
  onBack,
  backLabel = "Back",
  children,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  /** Controls at the right-hand end, e.g. the report/block menu on a conversation. */
  children?: ReactNode;
}) {
  const { onScreen, exit } = useSocialNav();
  const back = onBack ?? exit;
  useBrowserBack(onScreen ? back : null);
  return (
    <header className="social-header no-print">
      <BackButton onClick={back} ariaLabel={backLabel} />
      <h2 className="social-title">{title}</h2>
      {children}
    </header>
  );
}
