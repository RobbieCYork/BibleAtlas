import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TRANSLATIONS } from "../lib/bibleTranslation";
import { PACKS, packFor } from "../lib/offline/catalog";
import {
  cancelDownload,
  removeBible,
  startDownload,
  useDownloadSummary,
  useOfflineBibles,
  type TranslationDownload,
} from "../lib/offline/bibles";
import { getShellState, subscribeShell } from "../lib/offline/shell";
import { useOnline } from "../lib/offline/useOnline";
import { isRememberMe } from "../lib/supabase";
import "./OfflineBibles.css";

const size = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

const STOPPED = {
  offline: "Paused: the connection dropped. It carries on when you're back online.",
  storage: "Stopped: this device is out of space. Free some space, then resume.",
  server: "Stopped: the file couldn't be fetched. Try again.",
};

/** One translation's row: what is on the device and what can be done about it. */
function Row({ id, name, state, online }: { id: string; name: string; state: TranslationDownload | undefined; online: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const pack = packFor(id);
  const installed = state?.installed;
  const pending = state?.pending;
  const running = !!state?.running;
  const updatable = !!installed && !!pack && pack.version !== installed.version;

  const status: string[] = [];
  if (installed) status.push(`Downloaded, ${size(installed.totalBytes)}`);
  if (running) status.push(`${installed ? "Updating" : "Downloading"}: ${size(pending?.doneBytes ?? 0)} of ${size(pending?.totalBytes ?? pack?.bytes ?? 0)}`);
  else if (pending) {
    status.push(pending.reason ? STOPPED[pending.reason] : "Paused.");
    status.push(`${size(pending.doneBytes)} of ${size(pending.totalBytes)} saved.`);
  } else if (updatable) status.push("A newer copy is available.");
  else if (!installed && pack) status.push(`${size(pack.bytes)} to download`);

  return (
    <li className="offline-bible" data-translation={id}>
      <div className="offline-bible-info">
        <span className="offline-bible-name">{name}</span>
        <span className="offline-bible-status" aria-live="polite">
          {status.join(" · ")}
        </span>
        {(running || pending) && (
          <progress
            className="offline-bible-progress"
            max={pending?.totalBytes ?? pack?.bytes ?? 1}
            value={pending?.doneBytes ?? 0}
            aria-label={`${name} download`}
          />
        )}
      </div>
      <div className="offline-bible-actions">
        {confirming ? (
          <>
            <span className="offline-bible-confirm">Delete from this device?</span>
            <button
              type="button"
              className="offline-bible-danger"
              onClick={() => {
                setConfirming(false);
                void removeBible(id);
              }}
            >
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </>
        ) : (
          <>
            {running && (
              <button type="button" onClick={() => void cancelDownload(id)}>
                Cancel
              </button>
            )}
            {!running && pack && pending && (
              <button type="button" disabled={!online} onClick={() => void startDownload(id)}>
                Resume
              </button>
            )}
            {!running && pending && (
              <button type="button" onClick={() => void cancelDownload(id)}>
                {installed ? "Discard update" : "Remove"}
              </button>
            )}
            {!running && !pending && pack && (!installed || updatable) && (
              <button type="button" className="offline-bible-primary" disabled={!online} onClick={() => void startDownload(id)}>
                {installed ? "Update" : "Download"}
              </button>
            )}
            {installed && (
              <button type="button" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/** The download list. Draws nothing when there is nothing to download and nothing downloaded. */
function OfflineBibleList() {
  const { ready, storageAvailable, byId } = useOfflineBibles();
  const online = useOnline();
  const shell = useSyncExternalStore(subscribeShell, getShellState, getShellState);
  const listed = TRANSLATIONS.filter((t) => packFor(t.id) || byId[t.id]);
  const has = Object.keys(byId).length > 0;

  if (!ready) return <p className="offline-bible-note">Checking this device…</p>;
  if (!storageAvailable)
    return <p className="offline-bible-note">This browser won't let the app save files (private browsing does this), so nothing can be downloaded here.</p>;

  return (
    <>
      <ul className="offline-bible-list">
        {listed.map((t) => (
          <Row key={t.id} id={t.id} name={t.label} state={byId[t.id]} online={online} />
        ))}
      </ul>
      {!online && <p className="offline-bible-note">You're offline. Downloading needs a connection.</p>}
      {has && shell === "saving" && <p className="offline-bible-note">Saving the app so it can open with no connection…</p>}
      {has && shell === "ready" && <p className="offline-bible-note offline-bible-shell-ready">The app is saved on this device and opens with no connection.</p>}
      {has && shell === "failed" && (
        <p className="offline-bible-note">The app itself couldn't be saved yet. Open it again with a connection to finish.</p>
      )}
      {has && !isRememberMe() && (
        <p className="offline-bible-note">
          To open the app offline later, and to see your highlights and notes there, log out and log in again with “Remember me”
          checked.
        </p>
      )}
      <p className="offline-bible-note">
        With no connection you can read and search a downloaded translation, open the people, place and topic articles, and see your
        highlights and notes as last copied to this device. Signing in, adding or changing highlights, notes and tags, narration and the
        map need a connection.
      </p>
    </>
  );
}

const offered = (downloaded: number) => PACKS.length > 0 || downloaded > 0;

/** My Profile's section, with the divider that follows it, so that hiding it leaves no double line. */
export default function OfflineBiblesSection() {
  const { ids } = useDownloadSummary();
  if (!offered(ids.length)) return null;
  return (
    <>
      <div className="auth-settings-section auth-settings-section-stacked offline-bibles">
        <span className="auth-settings-label">Offline Bibles</span>
        <p className="auth-benefits auth-benefits-inline">Download a translation to read it with no connection.</p>
        <OfflineBibleList />
      </div>
      <div className="auth-settings-divider" />
    </>
  );
}

/** The same list as a window over the reader. */
export function OfflineBiblesSheet({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return createPortal(
    <div className="share-modal-overlay offline-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-modal offline-sheet offline-bibles" role="dialog" aria-modal="true" aria-label="Offline Bibles">
        <div className="share-modal-header">
          <h3>Offline Bibles</h3>
          <button ref={closeRef} type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <OfflineBibleList />
      </div>
    </div>,
    document.body
  );
}
