import { useEffect, useId, useRef, useState } from "react";
import { MOBILE_TAB_ORDER, MOBILE_TAB_META, type MobileTabKey } from "../lib/mobileTabs";
import Icon from "./Icon";

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
 * Why it exists at all, given the bottom navigation bar already lists these seven: the bar is
 * customisable (Settings → Navigation Bar), and Timeline, Games and Notes have no other mobile
 * entry point. Hiding one of those from the bar would otherwise strand it. So this menu ALWAYS
 * lists all seven, regardless of the bar's visibility record — the destination someone hid is
 * exactly the one they need this menu to reach.
 *
 * It does NOT say which of the seven are currently in the bar. Rows used to carry a "not in bar"
 * tag for the hidden ones; it read as a debug string rather than as help, and the answer is one
 * glance at the bar itself, which is on screen directly below this menu the whole time it is open.
 */
export default function MobileNavMenu({ current, onNavigate }: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

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
                  <Icon name={icon} />
                </span>
                <span className="mobile-nav-menu-label">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
