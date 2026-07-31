import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { SHARE_BACKGROUNDS, SHARE_BACKGROUND_CATEGORIES, type ShareBackground } from "../data/shareBackgrounds";
import { deliverCard, type ShareCardSpec } from "../lib/shareCard";

interface ShareCardModalProps {
  spec: ShareCardSpec;
  filename: string;
  onClose: () => void;
}

const CARD_W = 340;
const CARD_H = 425;

const HIGHLIGHT_COLORS = ["#fff59d", "#a5d6ff", "#b9f6ca", "#ffcdd2"];

/**
 * The share editor: pick a background theme, format the text, then share/download the result as a
 * PNG. The editable area is a plain contentEditable div — document.execCommand is deprecated but
 * still universally supported for exactly this (bold/italic/underline/highlight/font size on a
 * selection), and reimplementing a rich-text engine from scratch isn't worth it here. Export
 * rasterizes the live-styled preview DOM with html2canvas rather than redrawing everything on a
 * <canvas> by hand, so whatever the reader sees is exactly what gets shared.
 */
export default function ShareCardModal({ spec, filename, onClose }: ShareCardModalProps) {
  const [background, setBackground] = useState<ShareBackground>(SHARE_BACKGROUNDS[0]);
  const [activeCategory, setActiveCategory] = useState<(typeof SHARE_BACKGROUND_CATEGORIES)[number]>("Nature");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const editableRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Seeds the editable area once with the spec's own content — an uncontrolled contentEditable
  // (React can't own its children once execCommand starts mutating them directly).
  useEffect(() => {
    if (!editableRef.current) return;
    const bodyText = spec.bodyQuoted && spec.body ? `“${spec.body}”` : spec.body;
    editableRef.current.innerHTML = `
      <div class="share-card-badge">${spec.glyph} ${escapeHtml(spec.badge.toUpperCase())}</div>
      <div class="share-card-title">${escapeHtml(spec.title)}</div>
      ${bodyText ? `<div class="share-card-body">${escapeHtml(bodyText)}</div>` : ""}
    `.trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command: string, value?: string) => {
    editableRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setStatus(null);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas PNG export failed"))), "image/png")
      );
      const outcome = await deliverCard(blob, filename);
      if (outcome === "saved") setStatus("Saved image");
    } catch (err) {
      console.error("Share card export failed:", err);
      setStatus("Couldn't create image — try again.");
    } finally {
      setBusy(false);
    }
  };

  // Portaled to document.body rather than rendered in place: BiblePanel (this modal's usual caller)
  // has `zoom: var(--text-scale, 1)` applied for the app's text-size setting, and `zoom` scales its
  // entire subtree including fixed-position descendants — left in place, this modal's fixed overlay
  // would render visually bigger and mispositioned any time text-size is above 100%, cutting off the
  // card and pushing the Share/Save button out of reach. Rendering at the document root sidesteps that
  // ancestor entirely, matching LinkChoicePopup's own use of createPortal for the same reason.
  return createPortal(
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Share</h3>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="share-modal-body">
          <div
            ref={cardRef}
            className="share-card-preview"
            style={{
              width: "100%",
              maxWidth: CARD_W,
              aspectRatio: `${CARD_W} / ${CARD_H}`,
              background: background.css,
              color: background.textColor,
            }}
          >
            {background.symbol && <span className="share-card-symbol">{background.symbol}</span>}
            <div ref={editableRef} className="share-card-content" contentEditable suppressContentEditableWarning />
            <div className="share-card-footer">Biblical Atlas</div>
          </div>

          <div className="share-modal-controls">
            <div className="share-card-toolbar" role="toolbar" aria-label="Text formatting">
              <button type="button" onClick={() => exec("bold")} title="Bold">
                <strong>B</strong>
              </button>
              <button type="button" onClick={() => exec("italic")} title="Italic">
                <em>I</em>
              </button>
              <button type="button" onClick={() => exec("underline")} title="Underline">
                <span style={{ textDecoration: "underline" }}>U</span>
              </button>
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="share-card-toolbar-swatch"
                  style={{ background: color }}
                  title="Highlight"
                  onClick={() => exec("hiliteColor", color)}
                />
              ))}
              <button type="button" onClick={() => exec("hiliteColor", "transparent")} title="Remove highlight">
                🚫
              </button>
              <span className="share-card-toolbar-divider" />
              <button type="button" onClick={() => exec("fontSize", "2")} title="Small text">
                S
              </button>
              <button type="button" onClick={() => exec("fontSize", "4")} title="Medium text">
                M
              </button>
              <button type="button" onClick={() => exec("fontSize", "6")} title="Large text">
                L
              </button>
              <button type="button" onClick={() => exec("fontSize", "7")} title="Extra large text">
                XL
              </button>
            </div>

            <div className="share-card-bg-tabs" role="tablist">
              {SHARE_BACKGROUND_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === cat}
                  className={activeCategory === cat ? "active" : ""}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="share-card-bg-grid">
              {SHARE_BACKGROUNDS.filter((b) => b.category === activeCategory).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`share-card-bg-swatch ${background.id === b.id ? "active" : ""}`}
                  style={{ background: b.css }}
                  title={b.label}
                  aria-label={b.label}
                  onClick={() => setBackground(b)}
                >
                  {b.symbol && <span>{b.symbol}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="share-modal-actions">
          {status && <span className="comment-status">{status}</span>}
          <button type="button" className="share-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="share-modal-submit" onClick={handleExport} disabled={busy}>
            {busy ? "Preparing…" : "Share / Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
