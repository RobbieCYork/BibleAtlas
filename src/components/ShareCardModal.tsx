import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { SHARE_BACKGROUNDS, type ShareBackground, type ShareBackgroundCategory } from "../data/shareBackgrounds";
import { deliverCard, type ShareCardSpec } from "../lib/shareCard";
import {
  composeShareCard,
  DEFAULT_REGION,
  loadImage,
  scrimCss,
  SHARE_FORMATS,
  type ShareFormat,
  type TextRegion,
} from "../lib/shareCardRender";
import Icon from "./Icon";

interface ShareCardModalProps {
  spec: ShareCardSpec;
  filename: string;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = ["#fff59d", "#a5d6ff", "#b9f6ca", "#ffcdd2"];

const CATEGORY_LABELS: { id: ShareBackgroundCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scripture", label: "Scripture" },
  { id: "holy-land", label: "Holy Land" },
  { id: "pacific-northwest", label: "Northwest" },
  { id: "landscape", label: "Landscapes" },
];

/** How far the type scale may bend before we accept a slightly tight (or slightly airy) card. */
const MIN_FIT = 0.62;
const MAX_FIT = 1.5;

/**
 * The share editor: pick a photographic background, format the text, then share/download the result
 * as a PNG sized for social.
 *
 * Three things are load-bearing here.
 *
 * **Legibility over arbitrary photography.** Every background declares the ink colour that works on
 * it (`textColor`) and where its calm region is (`safeArea`). The card uses both: the text block is
 * anchored into the calm region, and a gradient scrim — built from the same numbers the exporter
 * paints, see shareCardRender.ts — sits *behind that region only*, fading to fully transparent
 * across the rest of the frame. A soft text-shadow underneath handles the residual case of a bright
 * speckle landing directly behind a stroke.
 *
 * **Export ≠ preview.** The exported PNG is composited natively (photo via `drawImage`, scrim via
 * `createLinearGradient`) with only the *text* layer handed to html2canvas. See shareCardRender.ts
 * for why. That also means the export is a true 1080-wide image no matter how small the preview is.
 *
 * **The editable area** is a plain contentEditable div — `document.execCommand` is deprecated but
 * still universally supported for exactly this (bold/italic/underline/highlight/size on a
 * selection), and reimplementing a rich-text engine here isn't worth it.
 */
export default function ShareCardModal({ spec, filename, onClose }: ShareCardModalProps) {
  const [background, setBackground] = useState<ShareBackground>(SHARE_BACKGROUNDS[0]);
  const [category, setCategory] = useState<ShareBackgroundCategory | "all">("all");
  const [format, setFormat] = useState<ShareFormat>("portrait");
  const [photoReady, setPhotoReady] = useState(false);
  const [fit, setFit] = useState(1);
  /** Where the text block ended up, as card-height fractions — drives the scrim. See scrimLayers(). */
  const [region, setRegion] = useState<TextRegion>(DEFAULT_REGION);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLDivElement | null>(null);
  const editableRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const formatSpec = useMemo(() => SHARE_FORMATS.find((f) => f.id === format) ?? SHARE_FORMATS[0], [format]);
  const visible = useMemo(
    () => (category === "all" ? SHARE_BACKGROUNDS : SHARE_BACKGROUNDS.filter((b) => b.category === category)),
    [category]
  );

  // Seeds the editable area once with the spec's own content — an uncontrolled contentEditable
  // (React can't own its children once execCommand starts mutating them directly).
  useEffect(() => {
    if (!editableRef.current) return;
    // Scripture cards lead with the verse and sign it with the reference — that is the shape people
    // actually post. Place/person cards keep the badge → name → hook order, where the name is the
    // point and the badge tells you what kind of thing it is.
    editableRef.current.innerHTML = spec.bodyQuoted
      ? `
      <div class="share-card-body">${escapeHtml(spec.body ? `“${spec.body}”` : "")}</div>
      <div class="share-card-title share-card-title-ref">${escapeHtml(spec.title)}</div>
    `.trim()
      : `
      <div class="share-card-badge">${escapeHtml(spec.badge.toUpperCase())}</div>
      <div class="share-card-title">${escapeHtml(spec.title)}</div>
      ${spec.body ? `<div class="share-card-body">${escapeHtml(spec.body)}</div>` : ""}
    `.trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Decode the selected photo up front. Until it resolves the card shows the ~20px placeholder
  // scaled up and blurred, so the frame is never empty and never flashes white.
  useEffect(() => {
    let live = true;
    setPhotoReady(false);
    loadImage(background.file)
      .then(() => live && setPhotoReady(true))
      .catch(() => live && setPhotoReady(true));
    return () => {
      live = false;
    };
  }, [background.file]);

  /**
   * Shrinks the text block until it fits its safe region. Scripture ranges vary from six words to a
   * paragraph, and a card whose verse silently overflows (or scrolls) is worse than one set a couple
   * of points smaller — so the type scale bends instead of the layout breaking.
   */
  const refit = useCallback(() => {
    const box = editableRef.current;
    const card = cardRef.current;
    const ink = inkRef.current;
    if (!box || !card || !ink) return;
    // Every size inside the card is an `em` off this root, so the whole composition scales with the
    // card instead of the type staying 22px while the frame grows. 1em = card width / 34, i.e. the
    // proportions were tuned at the old 340px preview and hold at any width — including the 1080px
    // the exporter rasterises at.
    ink.style.fontSize = `${Math.max(6, card.getBoundingClientRect().width / 34)}px`;
    let scale = 1;
    const apply = (n: number) => {
      scale = n;
      box.style.setProperty("--fit", String(n));
    };
    const overflows = () => box.scrollHeight > box.clientHeight + 1;
    apply(1);
    if (overflows()) {
      // Long passage: step down until it clears.
      for (let i = 0; i < 12 && overflows() && scale > MIN_FIT; i += 1) apply(Math.max(MIN_FIT, scale - 0.04));
    } else {
      // Short verse: step up so "Jesus wept." fills the card instead of floating in it — a two-word
      // verse set at the same size as a twelve-line passage reads as a mistake, not as restraint.
      for (let i = 0; i < 12 && scale < MAX_FIT; i += 1) {
        const next = Math.min(MAX_FIT, scale + 0.05);
        apply(next);
        if (overflows()) {
          apply(next - 0.05);
          break;
        }
      }
    }
    setFit(scale);

    // Feed the settled geometry back to the scrim: it protects where the words actually are, which
    // for Scripture is anywhere between two lines and twelve.
    const cardBox = card.getBoundingClientRect();
    const textBox = box.getBoundingClientRect();
    if (cardBox.height > 0) {
      const top = (textBox.top - cardBox.top) / cardBox.height;
      const bottom = (textBox.bottom - cardBox.top) / cardBox.height;
      setRegion((prev) =>
        Math.abs(prev.top - top) < 0.005 && Math.abs(prev.bottom - bottom) < 0.005 ? prev : { top, bottom }
      );
    }
  }, []);

  useLayoutEffect(() => {
    refit();
  }, [refit, format, background.id]);

  // Cormorant and EB Garamond load asynchronously. A fit measured against the fallback face is a fit
  // measured against the wrong metrics — usually too generous, so the verse overflows the moment the
  // real face swaps in. Re-run once the webfonts are actually in.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && refit());
    return () => {
      live = false;
    };
  }, [refit]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => refit());
    ro.observe(card);
    return () => ro.disconnect();
  }, [refit]);

  const exec = (command: string, value?: string) => {
    editableRef.current?.focus();
    document.execCommand(command, false, value);
    refit();
  };

  const handleExport = async () => {
    if (!inkRef.current) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await composeShareCard({ background, format: formatSpec, region, inkEl: inkRef.current, html2canvas });
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
      <div className="share-modal share-modal-photo" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Share</h3>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="share-modal-body">
          <div className="share-card-stage">
            <div
              ref={cardRef}
              className="share-card-preview"
              data-format={format}
              style={{ aspectRatio: `${formatSpec.width} / ${formatSpec.height}` }}
            >
              {/* Placeholder first (instant paint, a few hundred bytes), full photo fades over it. */}
              <div
                className="share-card-photo-placeholder"
                style={{ backgroundImage: `url(${background.placeholder})` }}
                aria-hidden="true"
              />
              <img
                className={`share-card-photo ${photoReady ? "ready" : ""}`}
                src={background.file}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
              <div className="share-card-scrim" style={{ backgroundImage: scrimCss(background, region) }} aria-hidden="true" />
              {/* The ONLY element handed to html2canvas: text on transparency. */}
              <div ref={inkRef} className="share-card-ink" data-ink={background.textColor} data-safe={background.safeArea}>
                <div
                  ref={editableRef}
                  className="share-card-content"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={refit}
                  aria-label="Card text"
                />
                <div className="share-card-footer">
                  <span className="share-card-footer-mark">Capstone Bible</span>
                  <span className="share-card-footer-url">capstonebible.com</span>
                </div>
              </div>
            </div>

            <div className="share-format-row" role="group" aria-label="Card size">
              {SHARE_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`share-format-chip ${format === f.id ? "active" : ""}`}
                  aria-pressed={format === f.id}
                  onClick={() => setFormat(f.id)}
                >
                  <strong>{f.label}</strong>
                  <span>{f.hint}</span>
                </button>
              ))}
            </div>
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
                <Icon name="ban" />
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

            <div className="share-bg-filters" role="tablist" aria-label="Background category">
              {CATEGORY_LABELS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={category === cat.id}
                  className={`share-bg-filter ${category === cat.id ? "active" : ""}`}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="share-bg-grid" role="listbox" aria-label="Background image">
              {visible.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="option"
                  aria-selected={background.id === b.id}
                  className={`share-bg-thumb ${background.id === b.id ? "active" : ""}`}
                  style={{ backgroundImage: `url(${b.placeholder})` }}
                  title={b.title}
                  onClick={() => setBackground(b)}
                >
                  {/* Native lazy-loading: the browser fetches a thumbnail's full image only as it
                      scrolls near the viewport, so opening the picker costs ~30 tiny placeholders
                      (a few KB total), not ~30 × 250KB. */}
                  <img src={b.file} alt={b.title} loading="lazy" decoding="async" draggable={false} />
                  <span className="share-bg-thumb-check" aria-hidden="true">
                    ✓
                  </span>
                </button>
              ))}
              {visible.length === 0 && <p className="share-bg-empty">No backgrounds in this category yet.</p>}
            </div>
          </div>
        </div>

        <div className="share-modal-actions">
          {status && <span className="comment-status">{status}</span>}
          <span className="share-modal-size-note">
            {formatSpec.width}×{formatSpec.height}
            {fit !== 1 ? " · text fitted" : ""}
          </span>
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
