import { useEffect, useMemo, useState } from "react";
import "./StudyCollections.css";
import { supabase } from "../lib/supabase";
import {
  addItem,
  createCollection,
  deleteCollection,
  itemsOf,
  MAX_DESCRIPTION,
  MAX_TITLE,
  moveItem,
  refreshCollectionsEntitlement,
  removeItem,
  updateCollection,
  useStudyCollections,
  canonicalVerseRef,
  type CollectionItemKind,
  type StudyCollection,
  type StudyCollectionItem,
} from "../lib/studyCollections";
import { KIND_LABEL, recordName } from "../lib/collectionItemInfo";
import BackButton from "./BackButton";
import StudyCollectionPlusPrompt from "./StudyCollectionPlusPrompt";

interface StudyCollectionsViewProps {
  /** Free-text filter from the header search bar, shared with the other My Notes tabs. */
  searchQuery?: string;
  /** Opens a place / site / person / topic / event on its own screen. */
  onOpenItem?: (kind: "place" | "site" | "person" | "topic" | "event", refId: string) => void;
  /** Opens the Bible panel at a reference ("John 3" / "John 3:16"). */
  onGoToVerse: (reference: string) => void;
}

interface NoteInfo {
  id: string;
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  note_text: string;
}

const noteRef = (n: NoteInfo) =>
  n.start_verse === n.end_verse ? `${n.book} ${n.chapter}:${n.start_verse}` : `${n.book} ${n.chapter}:${n.start_verse}-${n.end_verse}`;

const snippet = (text: string, max = 110) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

/**
 * The Collections tab of My Notes: the reader's Study Collections (Capstone Plus, sql/046).
 * Renders nothing unless the collections store is ready — the parent hides the tab otherwise.
 */
export default function StudyCollectionsView({ searchQuery, onOpenItem, onGoToVerse }: StudyCollectionsViewProps) {
  const s = useStudyCollections();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = s.collections.find((c) => c.id === openId) ?? null;

  useEffect(() => {
    void refreshCollectionsEntitlement();
  }, [openId]);

  if (s.status !== "ready") return null;
  if (openId && !open) {
    // Deleted (here or in another tab): back to the list.
    setTimeout(() => setOpenId(null), 0);
    return null;
  }
  return open ? (
    <CollectionDetail
      key={open.id}
      collection={open}
      items={itemsOf(s, open.id)}
      entitled={s.entitled === true}
      searchQuery={searchQuery}
      onBack={() => setOpenId(null)}
      onOpenItem={onOpenItem}
      onGoToVerse={onGoToVerse}
    />
  ) : (
    <CollectionList
      collections={s.collections}
      countOf={(id) => s.items.filter((i) => i.collection_id === id).length}
      entitled={s.entitled === true}
      searchQuery={searchQuery}
      onOpen={setOpenId}
    />
  );
}

function CollectionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { title: string; description: string | null };
  submitLabel: string;
  onSubmit: (title: string, description: string | null) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="study-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const err = await onSubmit(title, description.trim() ? description : null);
        setBusy(false);
        if (err) setError(err);
      }}
    >
      <label className="study-form-field">
        <span>Name</span>
        <input type="text" value={title} maxLength={MAX_TITLE} required autoFocus onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="study-form-field">
        <span>Description (optional)</span>
        <textarea value={description} maxLength={MAX_DESCRIPTION} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && (
        <p className="study-error" role="alert">
          {error}
        </p>
      )}
      <div className="study-form-actions">
        <button type="submit" className="study-primary" disabled={busy || !title.trim()}>
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CollectionList({
  collections,
  countOf,
  entitled,
  searchQuery,
  onOpen,
}: {
  collections: StudyCollection[];
  countOf: (id: string) => number;
  entitled: boolean;
  searchQuery?: string;
  onOpen: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const q = searchQuery?.trim().toLowerCase() ?? "";
  const visible = q ? collections.filter((c) => `${c.title} ${c.description ?? ""}`.toLowerCase().includes(q)) : collections;

  return (
    <div className="study-screen" data-tier="plus">
      {!entitled && <StudyCollectionPlusPrompt />}
      {entitled &&
        (creating ? (
          <CollectionForm
            submitLabel="Create collection"
            onCancel={() => setCreating(false)}
            onSubmit={async (title, description) => {
              const r = await createCollection(title, description);
              if (!r.ok) return r.message;
              setCreating(false);
              onOpen(r.value.id);
              return null;
            }}
          />
        ) : (
          <button type="button" className="prayer-list-new-button study-new-button" onClick={() => setCreating(true)}>
            + New Collection
          </button>
        ))}
      {entitled && collections.length === 0 && !creating && (
        <p className="study-empty">
          No collections yet. Make one here, or choose “Add to collection” at the foot of any place, person, topic or event, on
          a Bible chapter, or on one of your verse notes.
        </p>
      )}
      {collections.length > 0 && visible.length === 0 && <p className="comment-status">Nothing matches “{searchQuery?.trim()}”.</p>}
      {!entitled && collections.length > 0 && (
        <p className="study-readonly-note">Your collections are kept. You can open and tidy them; adding needs Capstone Plus.</p>
      )}
      {visible.length > 0 && (
        <ul className="study-list">
          {visible.map((c) => {
            const n = countOf(c.id);
            return (
              <li key={c.id}>
                <button type="button" className="study-list-row" onClick={() => onOpen(c.id)}>
                  <span className="study-list-title">{c.title}</span>
                  <span className="study-list-meta">{n === 1 ? "1 item" : `${n} items`}</span>
                  {c.description && <span className="study-list-desc">{snippet(c.description)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CollectionDetail({
  collection,
  items,
  entitled,
  searchQuery,
  onBack,
  onOpenItem,
  onGoToVerse,
}: {
  collection: StudyCollection;
  items: StudyCollectionItem[];
  entitled: boolean;
  searchQuery?: string;
  onBack: () => void;
  onOpenItem?: StudyCollectionsViewProps["onOpenItem"];
  onGoToVerse: (reference: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [verseInput, setVerseInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Map<string, NoteInfo | null>>(new Map());

  // Verse notes live in the notes table; read the ones this collection points at (own rows only, by RLS).
  const noteIds = useMemo(() => items.filter((i) => i.kind === "note").map((i) => i.ref_id), [items]);
  const noteKey = noteIds.join(",");
  useEffect(() => {
    const missing = noteIds.filter((id) => !notes.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      const { data, error: e } = await supabase
        .from("notes")
        .select("id, book, chapter, start_verse, end_verse, note_text")
        .in("id", missing);
      if (cancelled || e) return;
      const found = new Map(((data as NoteInfo[] | null) ?? []).map((n) => [n.id, n]));
      setNotes((prev) => {
        const next = new Map(prev);
        for (const id of missing) next.set(id, found.get(id) ?? null);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey]);

  const q = searchQuery?.trim().toLowerCase() ?? "";
  const describe = (i: StudyCollectionItem) => {
    if (i.kind === "note") {
      const n = notes.get(i.ref_id);
      if (n === undefined) return { name: "Loading…", detail: "", missing: false };
      if (n === null) return { name: "This note was deleted", detail: "", missing: true };
      return { name: noteRef(n), detail: snippet(n.note_text), missing: false };
    }
    const r = recordName(i.kind, i.ref_id);
    return { name: r.missing ? "No longer in the library" : r.name, detail: "", missing: r.missing };
  };
  const visible = q ? items.filter((i) => `${describe(i).name} ${describe(i).detail}`.toLowerCase().includes(q)) : items;
  const reorderable = entitled && !q;

  const openItem = (i: StudyCollectionItem) => {
    if (i.kind === "verse") onGoToVerse(i.ref_id);
    else if (i.kind === "note") {
      const n = notes.get(i.ref_id);
      if (n) onGoToVerse(`${n.book} ${n.chapter}:${n.start_verse}`);
    } else onOpenItem?.(i.kind, i.ref_id);
  };

  const run = async (p: Promise<{ ok: true } | { ok: false; message: string }>) => {
    setError(null);
    const r = await p;
    if (!r.ok) setError(r.message);
  };

  const addVerse = async () => {
    const ref = canonicalVerseRef(verseInput);
    if (!ref) {
      setError("Type a Bible reference with a chapter, like John 3:16 or Psalm 23.");
      return;
    }
    setError(null);
    const r = await addItem(collection.id, "verse", ref);
    if (r.ok) setVerseInput("");
    else setError(r.message);
  };

  const suggestion = verseInput.trim() ? canonicalVerseRef(verseInput) : null;

  return (
    <div className="study-screen" data-tier="plus">
      <div className="study-detail-head">
        <BackButton onClick={onBack} label="Collections" />
      </div>
      {editing ? (
        <CollectionForm
          initial={{ title: collection.title, description: collection.description }}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={async (title, description) => {
            const r = await updateCollection(collection.id, title, description);
            if (!r.ok) return r.message;
            setEditing(false);
            return null;
          }}
        />
      ) : (
        <div className="study-detail-title">
          <h3>{collection.title}</h3>
          {collection.description && <p className="study-detail-desc">{collection.description}</p>}
          <div className="study-detail-actions no-print">
            {entitled && (
              <button type="button" onClick={() => setEditing(true)}>
                ✎ Rename
              </button>
            )}
            {confirmDelete ? (
              <span className="study-confirm" role="group" aria-label="Confirm delete">
                <span>Delete this collection? This can't be undone.</span>
                <button type="button" className="study-danger" onClick={() => void run(deleteCollection(collection.id))}>
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="study-danger-quiet" onClick={() => setConfirmDelete(true)}>
                Delete collection
              </button>
            )}
          </div>
        </div>
      )}

      {!entitled && <StudyCollectionPlusPrompt compact />}

      {items.length === 0 && (
        <p className="study-empty">
          Nothing in this collection yet. Open a place, person, topic or event and choose “Add to collection” at the foot of
          it{entitled ? ", or add a Bible reference below" : ""}.
        </p>
      )}
      {items.length > 0 && visible.length === 0 && <p className="comment-status">Nothing matches “{searchQuery?.trim()}”.</p>}
      {q && visible.length > 1 && entitled && <p className="prayer-list-reorder-hint">Clear the search to reorder items.</p>}

      {visible.length > 0 && (
        <ol className="study-items">
          {visible.map((i, idx) => {
            const d = describe(i);
            const canOpen = !d.missing && (i.kind === "verse" || i.kind === "note" || !!onOpenItem);
            return (
              <li key={i.id} className={`study-item${d.missing ? " is-missing" : ""}`}>
                <div className="study-item-body">
                  <span className={`study-kind study-kind--${i.kind}`}>{KIND_LABEL[i.kind as CollectionItemKind]}</span>
                  {canOpen ? (
                    <button type="button" className="study-item-name" onClick={() => openItem(i)}>
                      {d.name}
                    </button>
                  ) : (
                    <span className="study-item-name is-static">{d.name}</span>
                  )}
                  {d.detail && <span className="study-item-detail">{d.detail}</span>}
                </div>
                <div className="study-item-controls no-print">
                  {reorderable && (
                    <>
                      <button
                        type="button"
                        className="prayer-list-reorder-btn"
                        disabled={idx === 0}
                        onClick={() => void run(moveItem(collection.id, i.id, "up"))}
                        aria-label={`Move ${d.name} up`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="prayer-list-reorder-btn"
                        disabled={idx === visible.length - 1}
                        onClick={() => void run(moveItem(collection.id, i.id, "down"))}
                        aria-label={`Move ${d.name} down`}
                      >
                        ▼
                      </button>
                    </>
                  )}
                  <button type="button" className="study-remove" onClick={() => void run(removeItem(i.id))} aria-label={`Remove ${d.name}`}>
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {entitled && (
        <form
          className="study-add-new study-add-verse no-print"
          onSubmit={(e) => {
            e.preventDefault();
            void addVerse();
          }}
        >
          <input
            type="text"
            value={verseInput}
            placeholder="Add a Bible reference, e.g. John 3:16"
            aria-label="Add a Bible reference"
            onChange={(e) => setVerseInput(e.target.value)}
          />
          <button type="submit" disabled={!verseInput.trim()}>
            Add
          </button>
          {suggestion && suggestion.toLowerCase() !== verseInput.trim().toLowerCase() && (
            <span className="study-verse-hint">Adds {suggestion}</span>
          )}
        </form>
      )}

      {error && (
        <p className="study-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
