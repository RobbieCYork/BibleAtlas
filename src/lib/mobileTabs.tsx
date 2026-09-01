import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** The seven destinations the mobile bottom bar can show. These are the tab bar's OWN keys, not
 * PanelKey values — "timeline" and "games" are full-screen takeovers with no panel at all, and
 * "social" is the tab that opens My Profile (its underlying panel is still PanelKey "friends").
 * Keeping them separate means nothing here renames or reuses a PanelKey or an existing storage key. */
export type MobileTabKey = "bible" | "map" | "timeline" | "notes" | "articles" | "social" | "games";

/** Fixed render order — the same order the bar has always shown (Bible, Map, Timeline, Notes,
 * Articles, Social, Games). Hiding a tab omits it in place; nothing is ever reordered, because the
 * owner asked to remove and re-add tabs, not rearrange them, and a stable order is what makes a
 * bottom bar learnable in the first place. */
export const MOBILE_TAB_ORDER: MobileTabKey[] = [
  "bible",
  "map",
  "timeline",
  "notes",
  "articles",
  "social",
  "games",
];

export const MOBILE_TAB_META: Record<MobileTabKey, { label: string; icon: string }> = {
  bible: { label: "Bible", icon: "📖" },
  map: { label: "Map", icon: "🗺️" },
  timeline: { label: "Timeline", icon: "⏳" },
  notes: { label: "Notes", icon: "📝" },
  articles: { label: "Articles", icon: "📚" },
  social: { label: "Social", icon: "🧑‍🤝‍🧑" },
  games: { label: "Games", icon: "🎮" },
};

/** Bible can never be hidden. It is the app's cold-start landing tab (App mounts mobile on
 * `bible`), it is the destination every other safety fallback in here points at, and it is the one
 * panel with no alternative mobile entry point that could rescue a reader who hid it. Locking it
 * means "somewhere sensible to go" is a guarantee rather than a computation. */
export const LOCKED_TAB: MobileTabKey = "bible";

/** Never fewer than three tabs on screen. Two would technically still be navigable, but the bar
 * would stop reading as a nav bar at all, and three keeps the reader within one tap of Bible plus
 * two chosen destinations. Below this, the remaining "hide" toggles are disabled and say why. */
export const MIN_VISIBLE_TABS = 3;

/** Versioned so a future change to the tab set can retire this shape rather than misread it. There
 * is no earlier version to migrate from — the bar was fixed at seven tabs before this — so an
 * unrecognised record is simply discarded for the defaults. */
const STORAGE_KEY = "mobile-tab-bar-visible-v1";

export const DEFAULT_VISIBLE_TABS: Record<MobileTabKey, boolean> = {
  bible: true,
  map: true,
  timeline: true,
  notes: true,
  articles: true,
  social: true,
  games: true,
};

const countVisible = (v: Record<MobileTabKey, boolean>) => MOBILE_TAB_ORDER.filter((k) => v[k]).length;

/** Same defensive read the timeline lane menu uses (see loadVisibleLanes in TimelineView.tsx):
 * unknown keys are ignored, non-boolean values are ignored, anything missing keeps its default of
 * visible, and the whole thing is wrapped so a corrupt/unparseable value can only ever mean "no
 * preference".
 *
 * Two extra guards on top, because the failure mode here is worse than a blank timeline — a bad
 * record could leave someone with no navigation at all:
 *  - The locked tab is forced back on regardless of what was stored.
 *  - Any record that would leave fewer than MIN_VISIBLE_TABS tabs showing is discarded outright in
 *    favour of all-visible. A stale or hostile value must never be able to strand a reader. */
export function loadVisibleTabs(): Record<MobileTabKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_TABS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_VISIBLE_TABS;
    const record = parsed as Record<string, unknown>;
    const next = { ...DEFAULT_VISIBLE_TABS };
    for (const key of MOBILE_TAB_ORDER) {
      if (typeof record[key] === "boolean") next[key] = record[key] as boolean;
    }
    next[LOCKED_TAB] = true;
    if (countVisible(next) < MIN_VISIBLE_TABS) return DEFAULT_VISIBLE_TABS;
    return next;
  } catch {
    return DEFAULT_VISIBLE_TABS;
  }
}

interface MobileTabsContextValue {
  visible: Record<MobileTabKey, boolean>;
  /** The tabs to actually render, in MOBILE_TAB_ORDER. Guaranteed non-empty and to contain the
   * locked tab. */
  visibleTabs: MobileTabKey[];
  /** True when hiding this tab is currently allowed — false for the locked tab, and false for every
   * still-visible tab once the bar is down to MIN_VISIBLE_TABS. */
  canHide: (key: MobileTabKey) => boolean;
  setTabVisible: (key: MobileTabKey, next: boolean) => void;
  resetTabs: () => void;
  isDefault: boolean;
}

const MobileTabsContext = createContext<MobileTabsContextValue | null>(null);

export function MobileTabsProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<Record<MobileTabKey, boolean>>(loadVisibleTabs);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    } catch {
      // Storage full or blocked — the choice still applies for this session, it just won't persist.
    }
  }, [visible]);

  const visibleTabs = useMemo(() => MOBILE_TAB_ORDER.filter((k) => visible[k]), [visible]);

  const canHide = useCallback(
    (key: MobileTabKey) => key !== LOCKED_TAB && countVisible(visible) > MIN_VISIBLE_TABS,
    [visible],
  );

  const setTabVisible = useCallback((key: MobileTabKey, next: boolean) => {
    setVisible((prev) => {
      if (next) return { ...prev, [key]: true };
      // Belt and braces: the UI already disables these toggles, but the guard lives here too so no
      // caller (or future entry point) can drive the bar below the minimum or hide the locked tab.
      if (key === LOCKED_TAB) return prev;
      if (countVisible(prev) <= MIN_VISIBLE_TABS) return prev;
      return { ...prev, [key]: false };
    });
  }, []);

  const resetTabs = useCallback(() => setVisible(DEFAULT_VISIBLE_TABS), []);

  const isDefault = MOBILE_TAB_ORDER.every((k) => visible[k]);

  const value = useMemo(
    () => ({ visible, visibleTabs, canHide, setTabVisible, resetTabs, isDefault }),
    [visible, visibleTabs, canHide, setTabVisible, resetTabs, isDefault],
  );

  return <MobileTabsContext.Provider value={value}>{children}</MobileTabsContext.Provider>;
}

export function useMobileTabs(): MobileTabsContextValue {
  const ctx = useContext(MobileTabsContext);
  if (!ctx) throw new Error("useMobileTabs must be used within a MobileTabsProvider");
  return ctx;
}
