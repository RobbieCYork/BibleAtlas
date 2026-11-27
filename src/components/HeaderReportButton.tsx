import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import ReportIssueSheet from "./ReportIssueSheet";
import MyReportsSheet from "./MyReportsSheet";
import type { ReportSurface } from "../lib/reportContext";
import { TOUR_ANCHORS } from "../data/welcomeTour";

interface HeaderReportButtonProps {
  userId: string;
  /** Where the reader is standing, from App's `reportSurface` memo: the same value the account menu's
   * "Report a Problem" gets, so both attach the same open article, chapter or screen. */
  surface: ReportSurface;
}

/** The header's "Report a Problem" flag, between the social marks and the account avatar.
 *
 * Borrows .social-links-item so size, colour and hover/focus match the marks beside it. Render it only
 * for a real (non-guest) account.
 *
 * Opens the form itself rather than driving AuthButton's menu, so Back returns the reader to the page
 * and does not leave the account menu open. */
export default function HeaderReportButton({ userId, surface }: HeaderReportButtonProps) {
  const [view, setView] = useState<"closed" | "report" | "myReports">("closed");
  return (
    <>
      <button
        type="button"
        data-tour={TOUR_ANCHORS.report}
        className="social-links-item header-report"
        aria-label="Report a Problem"
        title="Report a Problem"
        onClick={() => setView("report")}
      >
        <Icon name="flag" />
      </button>
      {/* Portaled out so the sheet covers the app header instead of sitting inside it. See .report-portal. */}
      {view !== "closed" &&
        createPortal(
          <div className="report-portal">
            {view === "report" ? (
              <ReportIssueSheet
                userId={userId}
                isGuest={false}
                surface={surface}
                onClose={() => setView("closed")}
                onOpenMyReports={() => setView("myReports")}
              />
            ) : (
              <MyReportsSheet
                userId={userId}
                onClose={() => setView("closed")}
                onReportSomething={() => setView("report")}
              />
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
