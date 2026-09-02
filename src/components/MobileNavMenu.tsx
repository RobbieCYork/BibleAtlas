import { useEffect, useId, useRef, useState } from "react";
import { MOBILE_TAB_ORDER, MOBILE_TAB_META, useMobileTabs, type MobileTabKey } from "../lib/mobileTabs";

interface MobileNavMenuProps {
  /** Which of the seven destinations is on screen right now (App derives this in the same
   * precedence the tab bar's active styling uses — takeovers win over the mounted panel). */
  current: MobileTabKey;
  /** Navigate to a destination. App owns the actual routing, including the Timeline/Games/My
   * Profile takeovers, which are not panels. */
  onNavigate: (key: MobileTabKey) => void;
}

/** The mobile header's hamburger.
 *
 * Deliberately NOT the desktop `PanelMenu`: that one is a set of checkboxes toggling which panels
 * are open (several at once, capped at three) over five PanelKeys. This is single-select
 * navigation over the seven mobile destinations, three of which (Timeline, Games, Social) are not
 * panels at all. Same glyph, different verb — sharing a component would mean a prop-driven fork at
 * every line of both the markup and the behaviour.
 *
 * Why it exists at all, given the bottom tab bar already lists these seven: the bar is
 * customisable (Settings → Tab Bar), and Timeline, Games and Notes have no other mobile entry
 * point. Hiding one of those from the bar would otherwise strand it. So this menu ALWAYS lists all
 * seven, regardless of the tab-bar visibility record — the destination someone hid is exactly the
 * one they need this menu to reach.
 */
export default function MobileNavMenu({ current, onNavigate }: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  // Read only to annotate rows — never to filter them. See the component comment above.
  const { visible } = useMobileTabs();

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Opening with the keyboard should land inside the menu, not leave focus parked on the button
  // with an invisible cursor. Prefer the row for wherever the reader currently is.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const target =
      listRef.current.querySelector<HTMLButtonElement>('[aria-current="page"]') ??
      listRef.current.querySelector<HTMLButtonElement>("button");
    target?.focus();
  }, [open]);

  const select = (key: MobileTabKey) => {
    setOpen(false);
    buttonRef.current?.focus();
    onNavigate(key);
  };

  return (
    <div className="mobile-nav-menu" ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        className="mobile-nav-menu-button"
        aria-label="Menu — go to Bible, Map, Timeline, Notes, Articles, Social or Games"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mobile-nav-menu-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      {open && (
        <div className="mobile-nav-menu-dropdown" id={menuId} role="menu" ref={listRef}>
          {MOBILE_TAB_ORDER.map((key) => {
            const { label, icon } = MOBILE_TAB_META[key];
            const isCurrent = key === current;
            const hiddenFromBar = visible[key] === false;
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                className={`mobile-nav-menu-item${isCurrent ? " active" : ""}`}
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => select(key)}
              >
                <span className="mobile-nav-menu-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="mobile-nav-menu-label">{label}</span>
                {/* Only shown for a destination the reader has taken out of the bottom bar. It
                    answers the question the menu otherwise raises — "why does this list more than
                    the bar?" — and points at Settings for putting it back. Nothing is marked at
                    all in the default all-seven-visible state, so it costs nothing until it
                    means something. */}
                {hiddenFromBar && <span className="mobile-nav-menu-tag">not in bar</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
