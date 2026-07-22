import type { PanelKey } from "./PanelMenu";

interface MobileTabBarProps {
  active: PanelKey;
  hasSelection: boolean;
  onSelect: (key: PanelKey) => void;
}

const TABS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "bible", label: "Bible", icon: "📖" },
  { key: "map", label: "Map", icon: "🗺️" },
  { key: "details", label: "Details", icon: "📍" },
];

export default function MobileTabBar({ active, hasSelection, onSelect }: MobileTabBarProps) {
  return (
    <nav className="mobile-tab-bar">
      {TABS.map((tab) => {
        const showDot = tab.key === "details" && hasSelection && active !== "details";
        return (
          <button
            key={tab.key}
            type="button"
            className={`mobile-tab ${active === tab.key ? "active" : ""}`}
            onClick={() => onSelect(tab.key)}
            aria-current={active === tab.key ? "page" : undefined}
          >
            <span className="mobile-tab-icon" aria-hidden="true">
              {tab.icon}
              {showDot && <span className="mobile-tab-dot" />}
            </span>
            <span className="mobile-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
