import { dismissConflicts, useOfflineStatus } from "../lib/offlineSync";
import "./OfflineBanner.css";

/** A thin strip that appears only when there is something to say: no connection, changes waiting to
 * sync, or an offline edit that had to be saved as a separate note. Silent otherwise. */
export default function OfflineBanner() {
  const { online, pending, syncing, conflicts } = useOfflineStatus();
  if (online && pending === 0 && conflicts === 0) return null;

  let text: string;
  if (conflicts > 0) {
    text = `${conflicts === 1 ? "A note you edited offline was" : `${conflicts} notes you edited offline were`} changed elsewhere too, so your version was saved as a separate note. Nothing was lost.`;
  } else if (!online) {
    text = pending > 0
      ? `You're offline. ${pending} change${pending === 1 ? "" : "s"} saved on this device will sync when you're back online.`
      : "You're offline. Chapters and notes you've already opened are still available.";
  } else {
    text = syncing ? "Syncing your offline changes…" : `${pending} change${pending === 1 ? "" : "s"} waiting to sync.`;
  }

  return (
    <div className={`offline-banner${conflicts > 0 ? " offline-banner-notice" : ""}`} role="status" aria-live="polite">
      <span>{text}</span>
      {conflicts > 0 && (
        <button type="button" className="offline-banner-dismiss" onClick={dismissConflicts}>
          OK
        </button>
      )}
    </div>
  );
}
