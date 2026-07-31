import { useState } from "react";
import ShareCardModal from "./ShareCardModal";
import type { ShareCardSpec } from "../lib/shareCard";

interface ShareCardButtonProps {
  spec: ShareCardSpec;
  filename: string;
  /** Button class — defaults to the details-panel header style. */
  className?: string;
  label?: string;
  title?: string;
}

/** "Share" button — opens ShareCardModal so the reader can pick a background and format the text
 * before sharing/downloading, rather than generating a fixed card immediately. */
export default function ShareCardButton({
  spec,
  filename,
  className = "panel-share",
  label = "📤 Share",
  title = "Share this",
}: ShareCardButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} title={title} aria-label={title}>
        {label}
      </button>
      {open && <ShareCardModal spec={spec} filename={filename} onClose={() => setOpen(false)} />}
    </>
  );
}
