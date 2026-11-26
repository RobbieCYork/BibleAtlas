import { useState } from "react";
import { createPortal } from "react-dom";
import BackButton from "./BackButton";
import Icon from "./Icon";
import ReportIssueSheet from "./ReportIssueSheet";
import { ABOUT_PULL_QUOTE, ABOUT_SECTIONS, ABOUT_TITLE } from "../data/aboutPage";
import type { ReportSurface } from "../lib/reportContext";

interface AboutViewProps {
  userId: string;
  /** Returns to whatever was on screen when About was opened. */
  onClose: () => void;
  /** Handed to the report form opened from the foot of the page. */
  reportSurface: ReportSurface;
}

/** Full-screen "About Capstone Bible", opened from the main menu. Drawn over whatever the reader was
 * on and borrows My Profile's frame (.myprofile-*), exactly as SettingsView does. The signed-out copy
 * of the same words is the static page at /about (scripts/seo/render.mjs). */
export default function AboutView({ userId, onClose, reportSurface }: AboutViewProps) {
  const [reporting, setReporting] = useState(false);

  return (
    <section className="myprofile-root about-root" aria-label={ABOUT_TITLE}>
      <header className="myprofile-header">
        <BackButton onClick={onClose} ariaLabel={`Close ${ABOUT_TITLE}`} />
        <h2 className="myprofile-title">{ABOUT_TITLE}</h2>
      </header>
      <div className="myprofile-body">
        <article className="myprofile-body-inner about-text">
          <blockquote className="about-quote">{ABOUT_PULL_QUOTE}</blockquote>
          {ABOUT_SECTIONS.map((section, i) => (
            <section key={section.heading ?? i}>
              {section.heading && <h3>{section.heading}</h3>}
              {section.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </section>
          ))}
          <button type="button" className="about-report" onClick={() => setReporting(true)}>
            <Icon name="flag" inline /> Report a Problem
          </button>
        </article>
      </div>
      {/* Portaled out for the same reason My Profile's copy is: inside this takeover the sheet would
          sit under the app header. See .report-portal. */}
      {reporting &&
        createPortal(
          <div className="report-portal">
            <ReportIssueSheet
              userId={userId}
              isGuest={false}
              surface={reportSurface}
              onClose={() => setReporting(false)}
            />
          </div>,
          document.body,
        )}
    </section>
  );
}
