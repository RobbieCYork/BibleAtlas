import { usePlusPreview } from "../lib/plusPreview";

/** Floating "Plus preview: ON/OFF" key. Renders nothing for anyone who may not use the preview. */
export default function PlusPreviewLegend() {
  const { available, on, setOn } = usePlusPreview();
  if (!available) return null;
  return (
    <div className="plus-preview-legend no-print" data-plus-preview-legend>
      <button type="button" className="plus-preview-toggle" aria-pressed={on} onClick={() => setOn(!on)}>
        Plus preview: {on ? "ON" : "OFF"}
      </button>
      {on && (
        <div className="plus-preview-key">
          <span><i className="plus-preview-swatch plus-preview-swatch--plus" />PLUS: needs Capstone Plus</span>
          <span><i className="plus-preview-swatch plus-preview-swatch--free" />FREE: everyone</span>
        </div>
      )}
    </div>
  );
}
