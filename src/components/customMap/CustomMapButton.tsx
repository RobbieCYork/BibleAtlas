import Icon from "../Icon";
import { TestingMarker } from "../FeatureRelease";
import "./CustomMapButton.css";

/** The map page's way into the builder. Whether to draw it is lib/customMapAccess's decision. */
export default function CustomMapButton({ inTesting, onClick }: { inTesting: boolean; onClick: () => void }) {
  return (
    <button type="button" className="cm-open-button" onClick={onClick}>
      <Icon name="pin" inline /> Create Custom Map
      <TestingMarker show={inTesting} />
    </button>
  );
}
