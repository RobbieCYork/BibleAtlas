import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { renderSlide } from "../../lib/customMap/export";
import { slideTitle } from "../../lib/customMap/draw";
import type { ExportItem } from "../../lib/customMap/export";

/** Full screen, one slide at a time. Each is drawn exactly as it would be saved, then kept, so
 * moving back and forth needs no connection. Arrows, space, a presentation clicker, a tap on either
 * side or a swipe all move between them. */
export default function PresentView({ items, start, onClose }: { items: ExportItem[]; start: number; onClose: () => void }) {
  const [at, setAt] = useState(start);
  const [images, setImages] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const made = useRef(new Map<number, string>());
  const wanted = useRef(at);
  wanted.current = at;
  const touchX = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const itemsRef = useRef(items);

  // One slide at a time, the one on screen first.
  useEffect(() => {
    const controller = new AbortController();
    const list = itemsRef.current;
    void (async () => {
      while (!controller.signal.aborted && made.current.size < list.length) {
        const order = [wanted.current, wanted.current + 1, ...list.keys()];
        const next = order.find((i) => i < list.length && !made.current.has(i))!;
        try {
          const canvas = await renderSlide(list[next].slide, list[next].index, controller.signal);
          const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.92));
          canvas.width = canvas.height = 0;
          if (!blob) throw new Error("This device could not draw the slide.");
          if (controller.signal.aborted) return;
          made.current.set(next, URL.createObjectURL(blob));
          setImages(Object.fromEntries(made.current));
          setFailed(null);
        } catch (err) {
          if (!controller.signal.aborted) setFailed(err instanceof Error ? err.message : "The slide couldn't be drawn.");
          return;
        }
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const kept = made.current;
    return () => {
      kept.forEach((url) => URL.revokeObjectURL(url));
      kept.clear();
    };
  }, []);

  const go = (step: number) => setAt((i) => Math.min(items.length - 1, Math.max(0, i + step)));

  useEffect(() => {
    rootRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      else if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) go(1);
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) go(-1);
      else return;
      e.preventDefault();
    };
    // Leaving the browser's full screen (Esc) leaves the presentation too.
    let wasFull = !!document.fullscreenElement;
    const full = () => {
      if (wasFull && !document.fullscreenElement) closeRef.current();
      wasFull = !!document.fullscreenElement;
    };
    window.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", full);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", full);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
    // `go` only reads the slide count, which cannot change while presenting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="cm-present"
      role="dialog"
      aria-modal="true"
      aria-label="Presentation"
      ref={rootRef}
      tabIndex={-1}
      onTouchStart={(e) => (touchX.current = e.touches.length === 1 ? e.touches[0].clientX : null)}
      onTouchEnd={(e) => {
        const from = touchX.current;
        touchX.current = null;
        if (from === null) return;
        const dx = e.changedTouches[0].clientX - from;
        if (Math.abs(dx) > 50) {
          e.preventDefault();
          go(dx < 0 ? 1 : -1);
        }
      }}
    >
      <div className="cm-present-stage" onClick={(e) => go(e.clientX < window.innerWidth / 3 ? -1 : 1)}>
        {images[at] ? (
          <img src={images[at]} alt={`Slide ${at + 1}: ${slideTitle(items[at].slide, items[at].index)}`} />
        ) : failed ? (
          <div className="cm-present-message" onClick={(e) => e.stopPropagation()}>
            <p role="alert">{failed}</p>
            <button type="button" className="cm-button cm-button-primary" onClick={() => (setFailed(null), setAttempt((n) => n + 1))}>
              Try again
            </button>
          </div>
        ) : (
          <p className="cm-present-message" role="status">Drawing slide {at + 1}…</p>
        )}
      </div>
      <div className="cm-present-bar">
        <button type="button" aria-label="Previous slide" disabled={at === 0} onClick={() => go(-1)}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <span>
          {at + 1} / {items.length}
        </span>
        <button type="button" aria-label="Next slide" disabled={at === items.length - 1} onClick={() => go(1)}>
          <ChevronRight aria-hidden="true" />
        </button>
        <button type="button" aria-label="End presentation" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <p className="cm-present-rotate">Turn your phone sideways for a bigger slide.</p>
    </div>
  );
}
