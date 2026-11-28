import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AboutText from "./AboutText";
import { useFeatureAdmin } from "../lib/features";
import {
  ABOUT_LIMITS,
  AboutConflictError,
  BUILT_IN_ABOUT,
  aboutContentProblem,
  fetchAboutVersions,
  fetchSavedAbout,
  paragraphsToText,
  sameAboutContent,
  saveAboutContent,
  textToParagraphs,
  type AboutContent,
  type AboutVersion,
  type SavedAbout,
} from "../lib/aboutContent";
import { markUnsaved } from "../lib/unsavedChanges";

/* ============================================================================
 * Admin Console -> About page. OWNER ONLY, like the Features tab: the console
 * draws the tab for the owner alone and save_about_page() (sql/051) refuses
 * everyone else, administrators included.
 *
 * Plain text only. Each section is a heading box and one text box in which
 * every line is a paragraph, so it works with a phone keyboard. Nothing typed
 * here is ever treated as HTML.
 *
 * Undo: every save is kept (about_page_versions); any of them, or the
 * built-in text, can be loaded back into the editor and saved again.
 * Unsaved work: kept on this device as you type, restored when the editor
 * reopens, and guarded by a "leave without saving?" prompt.
 * ========================================================================== */

interface DraftSection {
  heading: string;
  body: string;
}
interface Draft {
  quote: string;
  sections: DraftSection[];
}

const toDraft = (c: AboutContent): Draft => ({
  quote: c.quote,
  sections: c.sections.map((s) => ({ heading: s.heading ?? "", body: paragraphsToText(s.paragraphs) })),
});

const fromDraft = (d: Draft): AboutContent => ({
  quote: d.quote.trim(),
  sections: d.sections.map((s) => ({ heading: s.heading.trim() || null, paragraphs: textToParagraphs(s.body) })),
});

const DRAFT_KEY = "about-editor-draft-v1";
const UNSAVED_KEY = "about-page-editor";
const UNSAVED_MESSAGE =
  "You have unsaved changes to the About page. Leave without saving?\n\nThey stay on this device and come back the next time you open the editor.";

interface StoredDraft {
  draft: Draft;
  /** The saved version the draft was started from (null = the built-in text). */
  baseUpdatedAt: string | null;
  at: string;
}

function readStoredDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredDraft;
    if (!v?.draft || typeof v.draft.quote !== "string" || !Array.isArray(v.draft.sections)) return null;
    if (!v.draft.sections.every((s) => typeof s?.heading === "string" && typeof s?.body === "string")) return null;
    return v;
  } catch {
    return null;
  }
}
function writeStoredDraft(v: StoredDraft | null) {
  try {
    if (v) localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* Storage blocked: the leave-without-saving prompt still guards the work. */
  }
}

/** A rough height for a text box, so a long section opens tall enough to read without being huge. */
const rowsFor = (text: string, min = 3, max = 16) =>
  Math.max(min, Math.min(max, text.split("\n").reduce((n, line) => n + 1 + Math.floor(line.length / 42), 0)));

/** Always with the time: two saves on the same day must be told apart. */
const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const firstWords = (c: AboutContent) => {
  const text = c.quote.trim() || c.sections[0]?.paragraphs[0] || "";
  return text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text;
};

type Availability = "loading" | "on" | "off" | "error";

export default function AboutPageEditor() {
  const { isOwner } = useFeatureAdmin();
  const [availability, setAvailability] = useState<Availability>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  /** What is live: the saved row, or null when readers get the built-in text. */
  const [saved, setSaved] = useState<SavedAbout | null>(null);
  /** The updated_at this editing session is based on; sent with Save so a save made elsewhere in
   * the meantime is caught (40001) instead of silently replaced. */
  const [expected, setExpected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => toDraft(BUILT_IN_ABOUT));
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [versions, setVersions] = useState<AboutVersion[] | null>(null);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const loaded = useRef(false);

  const live: AboutContent = saved?.content ?? BUILT_IN_ABOUT;
  const content = useMemo(() => fromDraft(draft), [draft]);
  const dirty = availability !== "loading" && !sameAboutContent(content, live);
  const problem = useMemo(() => aboutContentProblem(content), [content]);

  const load = useCallback(async (keepDraft: boolean) => {
    setLoadError(null);
    const r = await fetchSavedAbout();
    let base: SavedAbout | null = null;
    if (r.state === "saved") base = r.saved;
    if (r.state === "error") {
      setAvailability("error");
      setLoadError(r.message);
      return;
    }
    setAvailability(r.state === "unavailable" ? "off" : "on");
    setSaved(base);
    const baseContent = base?.content ?? BUILT_IN_ABOUT;
    const stored = keepDraft ? readStoredDraft() : null;
    if (stored && !sameAboutContent(fromDraft(stored.draft), baseContent)) {
      setDraft(stored.draft);
      // Keep the version the draft was started from, so saving it over a newer save is caught.
      setExpected(stored.baseUpdatedAt);
      setRestoredAt(stored.at);
    } else {
      writeStoredDraft(null);
      setDraft(toDraft(baseContent));
      setExpected(base?.updatedAt ?? null);
      setRestoredAt(null);
    }
  }, []);

  useEffect(() => {
    if (!isOwner || loaded.current) return;
    loaded.current = true;
    void load(true);
  }, [isOwner, load]);

  // Keep unsaved work on this device as it is typed, and guard every way out.
  useEffect(() => {
    if (availability === "loading" || availability === "error") return;
    if (dirty) writeStoredDraft({ draft, baseUpdatedAt: expected, at: new Date().toISOString() });
    else writeStoredDraft(null);
    markUnsaved(UNSAVED_KEY, dirty ? UNSAVED_MESSAGE : null);
  }, [draft, dirty, expected, availability]);
  useEffect(() => () => markUnsaved(UNSAVED_KEY, null), []);

  const loadVersions = useCallback(async () => {
    setVersionsError(null);
    try {
      setVersions(await fetchAboutVersions(30));
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : "Couldn't load the earlier versions.");
    }
  }, []);

  if (!isOwner) {
    return <p className="admin-note">The About page is edited by the owner account only.</p>;
  }
  if (availability === "loading") {
    return <p className="admin-note">Loading the About page…</p>;
  }
  if (availability === "error") {
    return (
      <div className="admin-about">
        <p className="auth-status auth-error">Couldn't load the About page: {loadError}</p>
        <button type="button" onClick={() => void load(true)}>
          Try again
        </button>
      </div>
    );
  }

  const edit = (fn: (d: Draft) => Draft) => {
    setStatus(null);
    setError(null);
    setDraft((d) => fn(d));
  };
  const setSection = (i: number, patch: Partial<DraftSection>) =>
    edit((d) => ({ ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const moveSection = (i: number, by: -1 | 1) =>
    edit((d) => {
      const next = [...d.sections];
      const [s] = next.splice(i, 1);
      next.splice(i + by, 0, s);
      return { ...d, sections: next };
    });
  const removeSection = (i: number) => {
    const s = draft.sections[i];
    if ((s.heading.trim() || s.body.trim()) && !window.confirm(`Remove section ${i + 1}${s.heading.trim() ? ` ("${s.heading.trim()}")` : ""} and its text?`)) return;
    edit((d) => ({ ...d, sections: d.sections.filter((_, j) => j !== i) }));
  };
  const addSection = () => edit((d) => ({ ...d, sections: [...d.sections, { heading: "", body: "" }] }));

  const discard = () => {
    if (!window.confirm("Throw away your unsaved changes and go back to the text readers see now?")) return;
    writeStoredDraft(null);
    setDraft(toDraft(live));
    setExpected(saved?.updatedAt ?? null);
    setRestoredAt(null);
    setConflict(false);
    setError(null);
    setStatus("Changes thrown away. The editor shows the text readers see now.");
  };

  const loadIntoEditor = (c: AboutContent, what: string) => {
    if (dirty && !window.confirm("Replace what is in the editor now? Your unsaved changes will be lost.")) return;
    setDraft(toDraft(c));
    setExpected(saved?.updatedAt ?? null);
    setRestoredAt(null);
    setConflict(false);
    setError(null);
    setMode("preview");
    setStatus(
      sameAboutContent(c, live)
        ? `${what} is what readers see already.`
        : `${what} is in the editor, shown as a preview. Nothing changes for readers until you press Save.`
    );
  };

  const save = async (overwrite = false) => {
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const result = await saveAboutContent(content, expected, overwrite);
      writeStoredDraft(null);
      setSaved(result);
      setExpected(result.updatedAt);
      setDraft(toDraft(result.content));
      setRestoredAt(null);
      setConflict(false);
      setStatus("Saved. Readers see the new text now, in the app and at capstonebible.com/about.");
      if (versions !== null) void loadVersions();
    } catch (err) {
      if (err instanceof AboutConflictError) setConflict(true);
      setError(err instanceof Error ? err.message : "Couldn't save the About page.");
    } finally {
      setSaving(false);
    }
  };

  const loadLatest = async () => {
    if (!window.confirm("Load the version saved elsewhere? What is in the editor now will be lost.")) return;
    writeStoredDraft(null);
    setConflict(false);
    setError(null);
    await load(false);
    setStatus("Loaded the latest saved version.");
  };

  const canSave = availability === "on" && dirty && !saving;
  const liveId = versions?.find((v) => sameAboutContent(v.content, live))?.id;

  return (
    <div className="admin-about">
      {availability === "off" && (
        <p className="admin-note admin-note-warn" role="status">
          <strong>Saving isn't switched on yet.</strong> The database change this needs (sql/051) hasn't been applied, so
          every reader sees the built-in text. You can edit and preview here, but Save stays off until it is.
        </p>
      )}
      <p className="admin-note">
        {saved
          ? `Readers see the text saved ${formatWhen(saved.updatedAt)}.`
          : "Readers see the built-in text — nothing has been saved here yet."}{" "}
        Plain text only. In each section's text box, every line is its own paragraph.
      </p>
      {restoredAt && (
        <p className="admin-note admin-about-restored" role="status">
          Brought back your unsaved changes from {formatWhen(restoredAt)}. Save them, or use Discard changes.
        </p>
      )}

      <div className="admin-about-bar">
        <div className="admin-about-mode" role="group" aria-label="Edit or preview">
          <button type="button" className={mode === "edit" ? "active" : ""} aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>
            Edit
          </button>
          <button type="button" className={mode === "preview" ? "active" : ""} aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>
            Preview
          </button>
        </div>
        <div className="admin-about-actions">
          <button type="button" className="admin-about-save" disabled={!canSave} onClick={() => void save(false)}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" disabled={!dirty || saving} onClick={discard}>
            Discard changes
          </button>
        </div>
        <p className="admin-about-state" aria-live="polite">
          {dirty ? <><span className="admin-about-dot" aria-hidden="true" /> Unsaved changes</> : "No unsaved changes"}
        </p>
      </div>

      {error && <p className="auth-status auth-error" role="alert">{error}</p>}
      {conflict && (
        <div className="admin-confirm">
          <p>Someone saved the About page after you opened it here. Your changes are still in the editor.</p>
          <div className="admin-confirm-actions">
            <button type="button" onClick={() => void loadLatest()}>
              Load their version
            </button>
            <button type="button" className="admin-danger" onClick={() => void save(true)}>
              Save mine over it
            </button>
          </div>
        </div>
      )}
      {status && <p className="auth-status admin-action-status" role="status">{status}</p>}

      {mode === "preview" ? (
        <div className="admin-about-preview">
          <p className="admin-block-heading">Preview — what readers will see</p>
          <article className="about-text">
            <AboutText content={content} />
          </article>
          {problem && <p className="auth-status auth-error">{problem}</p>}
        </div>
      ) : (
        <div className="admin-about-form">
          <label className="admin-about-field">
            <span className="admin-about-label">Pull quote</span>
            <span className="admin-about-hint">The large quotation at the top. Leave it empty for none.</span>
            <textarea
              value={draft.quote}
              rows={rowsFor(draft.quote, 2, 6)}
              maxLength={ABOUT_LIMITS.quote}
              onChange={(e) => edit((d) => ({ ...d, quote: e.target.value }))}
            />
          </label>

          {draft.sections.map((s, i) => (
            <fieldset key={i} className="admin-about-section">
              <legend>Section {i + 1}</legend>
              <label className="admin-about-field">
                <span className="admin-about-label">Heading</span>
                <span className="admin-about-hint">Optional. The opening letter has none.</span>
                <input
                  type="text"
                  value={s.heading}
                  placeholder="No heading"
                  maxLength={ABOUT_LIMITS.heading}
                  onChange={(e) => setSection(i, { heading: e.target.value })}
                />
              </label>
              <label className="admin-about-field">
                <span className="admin-about-label">Text</span>
                <span className="admin-about-hint">Every line is a paragraph.</span>
                <textarea value={s.body} rows={rowsFor(s.body, 4, 18)} onChange={(e) => setSection(i, { body: e.target.value })} />
              </label>
              <div className="admin-about-section-actions">
                <button type="button" disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label={`Move section ${i + 1} up`}>
                  ↑ Up
                </button>
                <button type="button" disabled={i === draft.sections.length - 1} onClick={() => moveSection(i, 1)} aria-label={`Move section ${i + 1} down`}>
                  ↓ Down
                </button>
                <button type="button" className="admin-danger" disabled={draft.sections.length <= 1} onClick={() => removeSection(i)}>
                  Remove section
                </button>
              </div>
            </fieldset>
          ))}
          <button type="button" className="admin-about-add" disabled={draft.sections.length >= ABOUT_LIMITS.sections} onClick={addSection}>
            + Add a section
          </button>
          {problem && dirty && <p className="auth-status auth-error">{problem}</p>}
        </div>
      )}

      <details
        className="admin-about-history"
        open={historyOpen}
        onToggle={(e) => {
          const open = (e.currentTarget as HTMLDetailsElement).open;
          setHistoryOpen(open);
          if (open && versions === null && availability === "on") void loadVersions();
        }}
      >
        <summary>Undo a save: earlier versions</summary>
        <p className="admin-note">
          Loading a version puts it in the editor as a preview. Nothing changes for readers until you press Save, and that
          save can be undone the same way.
        </p>
        <ul className="admin-about-versions">
          <li className="admin-about-version">
            <div className="admin-about-version-text">
              <span className="admin-about-version-when">The original text{!saved ? " (live now)" : ""}</span>
              <span className="admin-about-version-words">Built into the app — the words the page shipped with.</span>
            </div>
            <button type="button" onClick={() => loadIntoEditor(BUILT_IN_ABOUT, "The original text")}>
              Load into editor
            </button>
          </li>
          {(versions ?? []).map((v) => (
            <li key={v.id} className="admin-about-version">
              <div className="admin-about-version-text">
                <span className="admin-about-version-when">
                  Saved {formatWhen(v.savedAt)}
                  {v.id === liveId && saved ? " (live now)" : ""}
                </span>
                <span className="admin-about-version-words">{firstWords(v.content)}</span>
              </div>
              <button type="button" onClick={() => loadIntoEditor(v.content, `The version saved ${formatWhen(v.savedAt)}`)}>
                Load into editor
              </button>
            </li>
          ))}
        </ul>
        {availability === "on" && versions !== null && versions.length === 0 && (
          <p className="admin-note">Nothing has been saved yet, so there are no earlier versions.</p>
        )}
        {versionsError && <p className="auth-status auth-error">{versionsError}</p>}
      </details>
    </div>
  );
}
