export type MapMode = "vector" | "satellite";

interface ThenNowToggleProps {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
}

const MODES: { id: MapMode; label: string }[] = [
  { id: "vector", label: "Map" },
  { id: "satellite", label: "Satellite" },
];

export default function ThenNowToggle({ mode, onChange }: ThenNowToggleProps) {
  return (
    <div className="then-now-toggle">
      <span className="then-now-label">Then &amp; Now</span>
      <div className="then-now-buttons">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? "active" : ""}
            onClick={() => onChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
