import { useState } from "react";
import { createPortal } from "react-dom";
import AccountSettingsBody from "./AccountSettings";
import BackButton from "./BackButton";
import MyReportsSheet from "./MyReportsSheet";
import ReportIssueSheet from "./ReportIssueSheet";
import type { ReportSurface } from "../lib/reportContext";

interface SettingsViewProps {
  userId: string;
  /** Returns to whatever was on screen when Settings was opened. */
  onClose: () => void;
  /** Opens the welcome tour over this page. */
  onOpenTour: () => void;
  /** So a report started from "My Reports" ("report something") carries context. */
  reportSurface: ReportSurface;
}

/** Full-screen "Settings" for a real account, opened from the account menu. App draws it over whatever
 * the reader was on (a panel, Timeline, Games, My Profile) and leaves that mounted, so Back lands
 * exactly where they were. Borrows My Profile's frame (.myprofile-*), which carries the skin and
 * text-size rules for this shape of page. */
export default function SettingsView({ userId, onClose, onOpenTour, reportSurface }: SettingsViewProps) {
  // My Reports and the report form are the same full-screen sheets the account menu opens, drawn over
  // this page.
  const [sheet, setSheet] = useState<null | "myReports" | "report">(null);
  return (
    <section className="myprofile-root settings-root" aria-label="Settings">
      <header className="myprofile-header">
        <BackButton onClick={onClose} ariaLabel="Close Settings" />
        <h2 className="myprofile-title">Settings</h2>
      </header>
      <div className="myprofile-body">
        <div className="myprofile-body-inner">
          <AccountSettingsBody userId={userId} onOpenTour={onOpenTour} onOpenMyReports={() => setSheet("myReports")} />
        </div>
      </div>
      {/* Portaled out: these are the same position:fixed sheets the account menu draws, but there they sit
          inside the app header (z-index 65), which is what keeps the header's own controls from being
          drawn over their ← Back. Here they would sit under that header, so they go to <body> with
          .report-portal lifting them above it. */}
      {sheet &&
        createPortal(
          <div className="report-portal">
            {sheet === "myReports" && (
              <MyReportsSheet userId={userId} onClose={() => setSheet(null)} onReportSomething={() => setSheet("report")} />
            )}
            {sheet === "report" && (
              <ReportIssueSheet
                userId={userId}
                isGuest={false}
                surface={reportSurface}
                onClose={() => setSheet(null)}
                onOpenMyReports={() => setSheet("myReports")}
              />
            )}
          </div>,
          document.body,
        )}
    </section>
  );
}
