import { useEffect, useId, useState } from "react";
import "./StudyCollections.css";
import {
  addItem,
  collectionsHolding,
  createCollection,
  MAX_TITLE,
  refreshCollectionsEntitlement,
  removeRef,
  useStudyCollections,
  type CollectionItemKind,
} from "../lib/studyCollections";
import StudyCollectionPlusPrompt from "./StudyCollectionPlusPrompt";

interface AddToCollectionProps {
  kind: CollectionItemKind;
  refId: string | null | undefined;
  /** Shown in the button's accessible name: "Add John 3:16 to a study collection". */
  label?: string;
  className?: string;
}

/**
 * "Add to collection" — on an item's own screen (the foot of every article, a Bible chapter, a verse
 * note). Opens an inline sheet listing the reader's collections as checkboxes, plus "New collection".
 * A reader without Capstone Plus gets the Plus prompt in the sheet instead.
 *
 * Renders NOTHING without a session, before the collections are known, or while sql/046 is not
 * applied — see lib/studyCollections.ts.
 */
export default function AddToCollection({ kind, refId, label, className }: AddToCollectionProps) {
  const s = useStudyCollections();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheetId = useId();

  useEffect(() => {
    if (!open) return;
    void refreshCollectionsEntitlement();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // A different item on the same panel (the panel is reused) closes the sheet.
  useEffect(() => {
    setOpen(false);
    setError(null);
    setNewTitle("");
  }, [kind, refId]);

  if (s.status !== "ready" || !refId) return null;

  const holding = collectionsHolding(s, kind, refId);
  const entitled = s.entitled === true;
  const count = holding.size;

  const toggle = async (collectionId: string) => {
    setBusy(true);
    setError(null);
    const r = holding.has(collectionId) ? await removeRef(collectionId, kind, refId) : await addItem(collectionId, kind, refId);
    if (!r.ok) setError(r.message);
    setBusy(false);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    const r = await createCollection(newTitle);
    if (r.ok) {
      setNewTitle("");
      const a = await addItem(r.value.id, kind, refId);
      if (!a.ok) setError(a.message);
    } else {
      setError(r.message);
    }
    setBusy(false);
  };

  return (
    <div className={`study-add no-print${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className={`study-add-button${count > 0 ? " is-saved" : ""}`}
        aria-expanded={open}
        aria-controls={sheetId}
        aria-label={label ? `Add ${label} to a study collection` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{count > 0 ? "★" : "☆"}</span>{" "}
        {count === 0 ? "Add to collection" : count === 1 ? "In 1 collection" : `In ${count} collections`}
        <span className="study-plus-chip" aria-label="Capstone Plus">
          Plus
        </span>
      </button>
      {open && (
        <div className="study-add-sheet" id={sheetId} role="group" aria-label="Study collections">
          {!entitled ? (
            <StudyCollectionPlusPrompt compact />
          ) : (
            <>
              {s.collections.length === 0 ? (
                <p className="study-empty">You don't have any collections yet. Name your first one below.</p>
              ) : (
                <ul className="study-add-list">
                  {s.collections.map((c) => (
                    <li key={c.id}>
                      <label className="study-add-row">
                        <input type="checkbox" checked={holding.has(c.id)} disabled={busy} onChange={() => void toggle(c.id)} />
                        <span className="study-add-row-title">{c.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="study-add-new"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newTitle.trim()) void create();
                }}
              >
                <input
                  type="text"
                  value={newTitle}
                  maxLength={MAX_TITLE}
                  placeholder="New collection name"
                  aria-label="New collection name"
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <button type="submit" disabled={busy || !newTitle.trim()}>
                  Create
                </button>
              </form>
            </>
          )}
          {error && (
            <p className="study-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="study-add-done" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
