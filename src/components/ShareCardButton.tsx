import { useEffect, useRef, useState } from "react";
import { deliverCard } from "../lib/shareCard";

interface ShareCardButtonProps {
  /** Builds the card PNG on demand — only runs when the button is actually clicked. */
  getBlob: () => Promise<Blob>;
  filename: string;
  /** Button class — defaults to the details-panel header style. */
  className?: string;
  label?: string;
  title?: string;
}

/**
 * "Share" button that generates a share-card image and hands it off via the Web Share sheet
 * (mobile) or a PNG download (desktop), flashing a brief inline "Saved image" status for the
 * download path — same inline-status feedback idiom as the Friends/Groups invite-link copy.
 */
export default function ShareCardButton({
  getBlob,
  filename,
  className = "panel-share",
  label = "📤 Share",
  title = "Share this as an image card",
}: ShareCardButtonProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  const flash = (message: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setStatus(message);
    timerRef.current = window.setTimeout(() => setStatus(null), 2400);
  };

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await getBlob();
      const outcome = await deliverCard(blob, filename);
      if (outcome === "saved") flash("Saved image");
    } catch (err) {
      console.error("Share card failed:", err);
      flash("Couldn't create image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="share-card-wrap">
      {status && (
        <span className="share-card-status" role="status">
          {status}
        </span>
      )}
      <button type="button" className={className} onClick={handleClick} disabled={busy} title={title} aria-label={title}>
        {label}
      </button>
    </span>
  );
}
