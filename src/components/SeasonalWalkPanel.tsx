import { useState } from "react";
import type { SeasonalWalk } from "../data/seasonalWalks";
import { formatWalkStopReference } from "../data/seasonalWalks";
import Icon from "./Icon";

interface SeasonalWalkPanelProps {
  walk: SeasonalWalk;
  /** Index into walk.stops of the stop currently in focus. */
  stopIndex: number;
  /** Step to (and activate) the stop at this index — App drives the map focus + Bible reference. */
  onGoToStop: (index: number) => void;
  onClose: () => void;
}

/**
 * Floating step-through card for an active seasonal walk — deliberately NOT one of the LRU-managed
 * side panels (it's a lightweight overlay above the map, closer kin to the layer-controls card than
 * to BiblePanel), so opening it never evicts anything the reader had open.
 */
export default function SeasonalWalkPanel({ walk, stopIndex, onGoToStop, onClose }: SeasonalWalkPanelProps) {
  // Same collapse idiom as LayerControls' Legend — the full stop list is reference material, kept
  // folded so the card stays compact over the map (especially on phones).
  const [stopsOpen, setStopsOpen] = useState(false);
  const stop = walk.stops[stopIndex];
  const isFirst = stopIndex === 0;
  const isLast = stopIndex === walk.stops.length - 1;

  return (
    <section className="walk-panel" aria-label={`${walk.title} walk`}>
      <div className="walk-panel-header">
        <div className="walk-panel-heading">
          <div className="walk-panel-eyebrow">
            {walk.emoji} {walk.title}
          </div>
          <div className="walk-panel-progress">
            Stop {stopIndex + 1} of {walk.stops.length}
          </div>
        </div>
        <button type="button" className="walk-panel-close" onClick={onClose} aria-label="Close walk">
          ×
        </button>
      </div>
      <h3 className="walk-stop-label">{stop.label}</h3>
      <div className="walk-stop-reference"><Icon name="bible" inline /> {formatWalkStopReference(stop)}</div>
      <p className="walk-stop-blurb">{stop.blurb}</p>
      <div className="walk-panel-nav">
        <button
          type="button"
          className="walk-nav-button"
          onClick={() => onGoToStop(stopIndex - 1)}
          disabled={isFirst}
        >
          ← Prev
        </button>
        <button
          type="button"
          className="walk-nav-button walk-nav-next"
          onClick={() => onGoToStop(stopIndex + 1)}
          disabled={isLast}
        >
          Next →
        </button>
      </div>
      <button
        type="button"
        className="legend-toggle"
        onClick={() => setStopsOpen((o) => !o)}
        aria-expanded={stopsOpen}
      >
        {stopsOpen ? "▾" : "▸"} All stops
      </button>
      {stopsOpen && (
        <ol className="walk-stop-list">
          {walk.stops.map((s, i) => (
            <li key={s.position}>
              <button
                type="button"
                className={`walk-stop-list-item${i === stopIndex ? " walk-stop-list-item-active" : ""}`}
                onClick={() => onGoToStop(i)}
                aria-current={i === stopIndex ? "step" : undefined}
              >
                <span className="walk-stop-list-num" aria-hidden="true">
                  {s.position}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
