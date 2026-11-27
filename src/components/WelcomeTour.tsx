import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Icon from "./Icon";
import { SECTIONS as ARTICLE_SECTIONS } from "./ArticlesPanel";
import { GAMES } from "./GameCenter";
import { TRANSLATIONS } from "../lib/bibleTranslation";
import { useFeatures, FEATURES, type FeatureKey, type FeatureVisibility } from "../lib/features";
import { MOBILE_TAB_META, useMobileTabs } from "../lib/mobileTabs";
import { useTabStages } from "../lib/tabFeatures";
import { TOUR_STEPS, type TourAnchor, type TourChip, type TourPlaceholder, type TourStep, type TourWhere } from "../data/welcomeTour";
import "./WelcomeTour.css";

interface WelcomeTourProps {
  isMobile: boolean;
  /** The seasonal walk whose banner is on screen, or null. */
  walkTitle: string | null;
  onClose: () => void;
}

const STEPS: readonly TourStep[] = TOUR_STEPS;
const FEATURE_KEYS: FeatureKey[] = FEATURES.map((f) => f.key);

/** "a, b and c" */
function listOf(items: string[]): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const canSee = (stages: Record<FeatureKey, FeatureVisibility>, any: FeatureKey[]) => any.some((k) => stages[k].visible);

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Layout {
  ring: Box | null;
  card: CSSProperties;
}

/** The first of these controls that is really on screen. A control under a full-screen view
 * (Settings, Timeline, Games, My Profile) does not count. */
function findAnchor(anchors: TourAnchor[]): DOMRect | null {
  const takeovers = [...document.querySelectorAll(".app-body > .timeline-mode, .app-body > .myprofile-mode, .app-body > .game-mode")];
  for (const anchor of anchors) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`)) {
      if (takeovers.length && el.closest(".app-body") && !takeovers.some((t) => t.contains(el))) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.right <= 0 || r.top >= window.innerHeight || r.left >= window.innerWidth) continue;
      if (getComputedStyle(el).visibility === "hidden") continue;
      return r;
    }
  }
  return null;
}

const EDGE = 12;
/** The card's width in WelcomeTour.css, and the narrowest it is squeezed to beside a large control. */
const CARD_WIDTH = 440;
const NARROW_CARD_WIDTH = 300;
/** The card never gets shorter than this to keep clear of a ringed control; it covers it instead. */
const MIN_CARD_HEIGHT = 340;

/** Where the card goes. On a phone it sits at one height above the bottom bar, so Back and Next stay
 * put from step to step, and gives up height rather than cover the ringed control. On a wider screen
 * it is centred, and moves beside or below a control it would cover. */
function placeCard(isMobile: boolean, ring: Box | null, height: number): CSSProperties {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_WIDTH, vw - EDGE * 2);
  if (isMobile) {
    const bar = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect();
    const header = document.querySelector(".app-header")?.getBoundingClientRect();
    const floor = bar && bar.height ? Math.min(vh, bar.top) - 10 : vh - EDGE;
    let ceiling = header ? header.bottom + 8 : EDGE;
    if (ring && ring.top < vh / 2) ceiling = Math.max(ceiling, ring.top + ring.height + 10);
    let bottom = floor;
    if (bottom - ceiling < Math.min(MIN_CARD_HEIGHT, height)) {
      // Not enough room between the two: use the whole screen.
      ceiling = EDGE;
      bottom = height > floor - EDGE ? vh - EDGE : floor;
    }
    return { left: (vw - w) / 2, bottom: vh - bottom, maxHeight: bottom - ceiling };
  }
  const maxHeight = vh - EDGE * 2;
  const h = Math.min(height, maxHeight);
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vw - w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vh - h - EDGE);
  const centred = { left: clampX((vw - w) / 2), top: clampY((vh - h) / 2), maxHeight };
  if (!ring) return centred;
  const overlaps =
    centred.left < ring.left + ring.width + EDGE &&
    centred.left + w > ring.left - EDGE &&
    centred.top < ring.top + ring.height + EDGE &&
    centred.top + h > ring.top - EDGE;
  if (!overlaps) return centred;
  if (ring.left - EDGE * 2 >= w) return { left: ring.left - EDGE - w, top: centred.top, maxHeight };
  if (vw - (ring.left + ring.width) - EDGE * 2 >= w) return { left: ring.left + ring.width + EDGE, top: centred.top, maxHeight };
  const under = ring.top + ring.height + EDGE;
  const room = vh - under - EDGE;
  if (room >= Math.min(MIN_CARD_HEIGHT, h)) return { left: centred.left, top: under, maxHeight: room };
  // A control as tall as the screen (the map): a narrower card in the space to its left.
  const beside = ring.left - EDGE * 2;
  if (beside >= NARROW_CARD_WIDTH) return { left: EDGE, top: centred.top, width: beside, maxHeight };
  return centred;
}

/** "Welcome to Capstone Bible": one idea per step, with the control it describes ringed. A modal
 * <dialog>, so focus stays inside it, the page behind is inert and Escape closes it. */
export default function WelcomeTour({ isMobile, walkTitle, onClose }: WelcomeTourProps) {
  const stages = useFeatures(FEATURE_KEYS);
  const { visible: tabsShown } = useMobileTabs();
  const { isAvailable: tabAvailable } = useTabStages();
  const steps = STEPS.filter(
    (s) =>
      (!s.features || s.features.every((k) => stages[k].visible)) &&
      (!s.anyFeature || canSee(stages, s.anyFeature)) &&
      (!s.seasonal || !!walkTitle),
  );

  const [position, setPosition] = useState({ id: STEPS[0].id, index: 0 });
  // Followed by id, so a step appearing or leaving (a stage loading late) does not move the reader.
  const found = steps.findIndex((s) => s.id === position.id);
  const index = found >= 0 ? found : Math.min(position.index, steps.length - 1);
  const step = steps[index];
  const first = index === 0;
  const last = index === steps.length - 1;
  const go = (to: number) => {
    const next = steps[to];
    if (next) setPosition({ id: next.id, index: to });
  };

  const values: Record<TourPlaceholder, string> = {
    translations: listOf(TRANSLATIONS.map((t) => t.label)),
    games: listOf(GAMES.filter((g) => stages[g.feature].visible).map((g) => g.title)),
    sections: listOf(ARTICLE_SECTIONS.map((s) => s.label)),
    walk: walkTitle ?? "",
  };
  const fill = (text: string) => text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key as TourPlaceholder] ?? whole);
  const body = [step.body, ...(step.extras ?? []).filter((e) => canSee(stages, e.anyFeature)).map((e) => e.text)];

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    nextRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const anchors = step.anchors?.[isMobile ? "phone" : "desktop"];
  const anchorKey = anchors?.join(" ") ?? "";
  // Transparent, not hidden, until measured: a hidden button cannot take the opening focus.
  const [layout, setLayout] = useState<Layout>({ ring: null, card: { opacity: 0 } });

  useLayoutEffect(() => {
    const measure = () => {
      const card = cardRef.current;
      const scroller = scrollRef.current;
      if (!card || !scroller) return;
      const r = anchorKey ? findAnchor(anchorKey.split(" ") as TourAnchor[]) : null;
      let ring: Box | null = null;
      if (r) {
        // Kept inside the screen so the whole outline shows.
        const top = Math.max(2, r.top - 4);
        const left = Math.max(2, r.left - 4);
        ring = {
          top,
          left,
          width: Math.min(document.documentElement.clientWidth - 2, r.right + 4) - left,
          height: Math.min(window.innerHeight - 2, r.bottom + 4) - top,
        };
      }
      // The height the card would take with nothing scrolled.
      const natural = card.offsetHeight - scroller.clientHeight + scroller.scrollHeight;
      const next: Layout = { ring, card: placeCard(isMobile, ring, natural) };
      setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    // The page behind can still be settling (Bible text loading, fonts, a rotation).
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
    };
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step.id]);

  const chip = (c: TourChip, key: number) => {
    const meta = "tab" in c ? MOBILE_TAB_META[c.tab] : c;
    return (
      <span key={key} className="welcome-tour-chip">
        {meta.icon && <Icon name={meta.icon} />}
        <span>{meta.label}</span>
      </span>
    );
  };

  const where = (w: TourWhere, phone: boolean) => {
    let path = w.path;
    let hint = w.hint;
    const lead = path[0];
    if (phone && lead && "tab" in lead) {
      if (tabsShown[lead.tab] && tabAvailable(lead.tab)) hint ??= path.length === 1 ? "in the bottom bar" : undefined;
      else path = [{ icon: "menu", label: "Menu" }, ...path];
    }
    return (
      <>
        {path.map((c, i) => (
          <span key={i} className="welcome-tour-path">
            {i > 0 && (
              <span className="welcome-tour-arrow" aria-label="then">
                →
              </span>
            )}
            {chip(c, i)}
          </span>
        ))}
        {hint && <span className="welcome-tour-hint">{hint}</span>}
      </>
    );
  };

  // This screen's directions first.
  const places = (
    [
      { key: "phone", label: "On a phone", w: step.phone, mine: isMobile },
      { key: "desktop", label: "On a computer", w: step.desktop, mine: !isMobile },
    ] as const
  )
    .filter((p) => p.w)
    .sort((a, b) => Number(b.mine) - Number(a.mine));

  return (
    <dialog
      ref={dialogRef}
      className="welcome-tour"
      aria-labelledby="welcome-tour-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={(e) => {
        // The browser can close a dialog without asking (a second Escape).
        if (!e.currentTarget.open) onClose();
      }}
    >
      <div
        className={`welcome-tour-shade${layout.ring ? " welcome-tour-ring" : ""}`}
        style={layout.ring ?? undefined}
        aria-hidden="true"
      />
      <div ref={cardRef} className="welcome-tour-card" style={layout.card} data-step={step.id}>
        <div className="welcome-tour-top">
          <span className="welcome-tour-count">
            Step {index + 1} of {steps.length}
          </span>
          {!last && (
            <button type="button" className="welcome-tour-skip" onClick={onClose}>
              Skip tour
            </button>
          )}
        </div>
        <div className="welcome-tour-progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <div ref={scrollRef} className="welcome-tour-scroll" tabIndex={0}>
          <div aria-live="polite" aria-atomic="true">
            <span className="sr-only">
              Step {index + 1} of {steps.length}.
            </span>
            <div className="welcome-tour-heading">
              <span className="welcome-tour-icon" aria-hidden="true">
                <Icon name={step.icon} />
              </span>
              <h2 id="welcome-tour-title">{fill(step.title)}</h2>
            </div>
            <p className="welcome-tour-body">{fill(body.join(" "))}</p>
            {places.length > 0 && (
              <dl className="welcome-tour-where">
                {places.map((p) => (
                  <div key={p.key} className={p.mine ? "welcome-tour-mine" : undefined}>
                    <dt>{p.label}</dt>
                    <dd>{where(p.w!, p.key === "phone")}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
        <div className="welcome-tour-actions">
          <button type="button" className="welcome-tour-back" aria-disabled={first} onClick={() => go(index - 1)}>
            Back
          </button>
          <button ref={nextRef} type="button" className="welcome-tour-next" onClick={() => (last ? onClose() : go(index + 1))}>
            {last ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
