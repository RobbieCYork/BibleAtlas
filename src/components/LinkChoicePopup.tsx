import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { TimelineEvent } from "../data/types";
import { getTimelineEventsForEntity } from "../lib/timelineLinks";
import Icon from "./Icon";

/* ============================================================================
 * LinkChoicePopup — the small anchored "View X / View in Timeline" chooser.
 *
 * Shown ONLY when a clicked auto-linked name has a timeline association (a
 * primaryEntityIds match) AND has no more specific home of its own to always
 * win instead — in practice that's just "topic" today. Locations and people
 * always resolve straight to their own place/article: a mention of either
 * must never land on the Timeline, so those two kinds skip this chooser
 * entirely regardless of any timeline association they might also have. For
 * every other click — the overwhelming majority — the intercept calls the
 * original direct navigation callback untouched, with zero added friction.
 *
 * The intercept is wired through context rather than props so the deeply
 * nested render sites (every verse, every article paragraph) don't need new
 * prop plumbing, and so the auto-linker's name-resolution logic stays
 * completely untouched. When no provider is mounted, the intercept is inert
 * and every click navigates directly, exactly as before.
 * ========================================================================== */

export interface TimelineLinkHandlers {
  /** Navigate straight to one event's TimelineEventPanel (article view). */
  onSelectTimelineEvent: (id: string) => void;
  /** Open full Timeline mode zoomed to this entity's events/lifespan, briefly highlighted. */
  onOpenTimelineForEntity: (entityId: string) => void;
}

export const TimelineLinkContext = createContext<TimelineLinkHandlers | null>(null);

/** The minimal slice of a link annotation the intercept needs. */
interface InterceptableAnnotation {
  kind: "location" | "poi" | "person" | "topic" | "timeline" | "verse";
  id?: string;
  text: string;
}

interface ChoiceState {
  anchorRect: DOMRect;
  name: string;
  entityId: string;
  events: TimelineEvent[];
  direct: () => void;
}

/**
 * Hook used by VerseText and LinkedVerseText. Returns:
 * - interceptLinkClick(e, ann, direct): call in place of the direct navigation. If the clicked
 *   entity has no timeline association (or no provider is mounted), `direct()` runs immediately —
 *   identical behavior to before. Otherwise the anchored chooser opens.
 * - linkChoicePopup: render this once alongside the component's output (portals to <body>).
 */
export function useLinkChoice() {
  const handlers = useContext(TimelineLinkContext);
  const [choice, setChoice] = useState<ChoiceState | null>(null);

  const interceptLinkClick = (
    e: React.MouseEvent<HTMLElement>,
    ann: InterceptableAnnotation,
    direct: () => void
  ) => {
    // Verse refs and timeline-event links never need disambiguation; without a provider (or an id)
    // there is nothing to offer either. All of these fall straight through.
    //
    // Locations and people are map/article destinations first and foremost — a mention of either
    // must always land on its own place or person, never on the Timeline, even when the entity also
    // happens to have a timeline association (an event's primaryEntityIds match, or lifespan data).
    // The "View in Timeline" detour is only ever offered for kinds that have no more specific home of
    // their own (currently just "topic") — Timeline itself, and its own entries, are untouched; this
    // only changes what a location/person mention resolves to.
    if (
      !handlers ||
      !ann.id ||
      ann.kind === "verse" ||
      ann.kind === "timeline" ||
      ann.kind === "location" ||
      ann.kind === "person"
    ) {
      direct();
      return;
    }
    // Only "poi" and "topic" ever reach here now — "person" (lifespan data) is filtered out above,
    // so this is just the primaryEntityIds association check.
    const events = getTimelineEventsForEntity(ann.id);
    if (events.length === 0) {
      // The common case: no association — navigate directly, unchanged.
      direct();
      return;
    }
    setChoice({
      anchorRect: e.currentTarget.getBoundingClientRect(),
      name: ann.text,
      entityId: ann.id,
      events,
      direct,
    });
  };

  const linkChoicePopup: ReactNode = choice ? (
    <LinkChoicePopup
      anchorRect={choice.anchorRect}
      name={choice.name}
      onViewDirect={() => {
        setChoice(null);
        choice.direct();
      }}
      onViewTimeline={() => {
        setChoice(null);
        // Exactly one associated event → straight to its article. A lifespan with no single
        // dominant event, or multiple events → open Timeline mode focused on the entity.
        if (choice.events.length === 1 && handlers) handlers.onSelectTimelineEvent(choice.events[0].id);
        else if (handlers) handlers.onOpenTimelineForEntity(choice.entityId);
      }}
      onClose={() => setChoice(null)}
    />
  ) : null;

  return { interceptLinkClick, linkChoicePopup };
}

interface LinkChoicePopupProps {
  anchorRect: DOMRect;
  name: string;
  onViewDirect: () => void;
  onViewTimeline: () => void;
  onClose: () => void;
}

export default function LinkChoicePopup({
  anchorRect,
  name,
  onViewDirect,
  onViewTimeline,
  onClose,
}: LinkChoicePopupProps) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Position after first paint (needs the popup's measured size), clamped to the viewport;
  // prefers below the clicked word, flips above when there's no room.
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(anchorRect.left + anchorRect.width / 2 - width / 2, 8), vw - width - 8);
    let top = anchorRect.bottom + 6;
    if (top + height > vh - 8) top = Math.max(anchorRect.top - height - 6, 8);
    setPos({ left, top });
  }, [anchorRect]);

  // Dismiss on outside press, Escape, scroll, or resize — anchored fixed positioning goes stale the
  // moment the page moves underneath it.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={popupRef}
      className="link-choice-popup"
      role="menu"
      aria-label={`Open ${name}`}
      style={pos ? { left: pos.left, top: pos.top, visibility: "visible" } : { left: 0, top: 0, visibility: "hidden" }}
    >
      <button type="button" role="menuitem" className="link-choice-option" onClick={onViewDirect}>
        <span className="link-choice-icon" aria-hidden="true">
          <Icon name="doc" />
        </span>
        View {name}
      </button>
      <button type="button" role="menuitem" className="link-choice-option" onClick={onViewTimeline}>
        <span className="link-choice-icon" aria-hidden="true">
          ⏳
        </span>
        View in Timeline
      </button>
    </div>,
    document.body
  );
}
