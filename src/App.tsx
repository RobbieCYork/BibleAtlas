import { useState } from "react";
import type maplibregl from "maplibre-gl";
import MapView from "./components/MapView";
import LayerControls from "./components/LayerControls";
import SearchBar from "./components/SearchBar";
import LocationPanel from "./components/LocationPanel";
import PoiPanel from "./components/PoiPanel";
import BiblePanel from "./components/BiblePanel";
import ThenNowToggle, { type MapMode } from "./components/ThenNowToggle";
import PanelMenu, { type PanelKey } from "./components/PanelMenu";
import ResizeHandle from "./components/ResizeHandle";
import { locations } from "./data/locations";
import { pois } from "./data/pois";
import "./App.css";

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 800;

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [poisVisible, setPoisVisible] = useState(true);
  const [locationsVisible, setLocationsVisible] = useState(true);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("satellite");
  const [bibleReference, setBibleReference] = useState<string | null>(null);
  const [panels, setPanels] = useState<Record<PanelKey, boolean>>({
    map: true,
    details: false,
    bible: true,
  });
  const [bibleWidth, setBibleWidth] = useState(340);
  const [detailsWidth, setDetailsWidth] = useState(380);

  const selectedLocation = locations.find((l) => l.id === selectedId) ?? null;
  const selectedPoi = pois.find((p) => p.id === selectedPoiId) ?? null;

  const togglePanel = (key: PanelKey) => setPanels((p) => ({ ...p, [key]: !p[key] }));
  const openPanel = (key: PanelKey) => setPanels((p) => ({ ...p, [key]: true }));
  const closePanel = (key: PanelKey) => setPanels((p) => ({ ...p, [key]: false }));

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null);
    setLocationsVisible(true);
    openPanel("details");
    openPanel("map");
  };

  const handleSelectPoi = (id: string) => {
    setSelectedPoiId(id);
    setSelectedId(null);
    openPanel("details");
    openPanel("map");
  };

  const hasSelection = selectedId !== null || selectedPoiId !== null;
  const clearSelection = () => {
    setSelectedId(null);
    setSelectedPoiId(null);
  };

  const openVerse = (reference: string) => {
    setBibleReference(reference);
    openPanel("bible");
  };

  // The details panel has nothing to show without a selection — hiding it lets the map expand
  // instead of leaving a blank panel visible (e.g. right after "Show All Pins" clears the selection).
  const showDetails = panels.details && hasSelection;
  const noPanelsOpen = !panels.bible && !panels.map && !showDetails;
  const sideExpand = !panels.map;

  return (
    <div className="app-shell">
      <header className="app-header">
        <PanelMenu panels={panels} onToggle={togglePanel} />
        <h1>New Testament Biblical Atlas</h1>
        <SearchBar locations={locations} onSelect={handleSelect} />
      </header>
      <div className="app-body">
        {panels.bible && (
          <BiblePanel
            reference={bibleReference}
            onClose={() => closePanel("bible")}
            onSelectLocation={handleSelect}
            onSelectPoi={handleSelectPoi}
            expand={sideExpand}
            style={{ width: bibleWidth }}
          />
        )}
        {panels.bible && panels.map && (
          <ResizeHandle
            width={bibleWidth}
            minWidth={MIN_PANEL_WIDTH}
            maxWidth={MAX_PANEL_WIDTH}
            direction={1}
            onWidthChange={setBibleWidth}
          />
        )}
        {panels.map && (
          <div className="map-area">
            <MapView
              locations={locations}
              selectedId={selectedId}
              onSelect={handleSelect}
              onMapLoad={setMap}
              mapMode={mapMode}
              locationsVisible={locationsVisible}
              pois={pois}
              poisVisible={poisVisible}
              selectedPoiId={selectedPoiId}
              onSelectPoi={handleSelectPoi}
            />
            <LayerControls
              map={map}
              poisVisible={poisVisible}
              onTogglePois={() => setPoisVisible((v) => !v)}
              poiCount={pois.length}
              locationsVisible={locationsVisible}
              onToggleLocations={() => setLocationsVisible((v) => !v)}
            />
            <ThenNowToggle mode={mapMode} onChange={setMapMode} />
            {hasSelection && (
              <button type="button" className="clear-selection-button" onClick={clearSelection}>
                × Show All Pins
              </button>
            )}
          </div>
        )}
        {panels.map && showDetails && (
          <ResizeHandle
            width={detailsWidth}
            minWidth={MIN_PANEL_WIDTH}
            maxWidth={MAX_PANEL_WIDTH}
            direction={-1}
            onWidthChange={setDetailsWidth}
          />
        )}
        {showDetails && selectedPoi && (
          <PoiPanel
            poi={selectedPoi}
            onClose={() => closePanel("details")}
            onSelectLocation={handleSelect}
            onSelectPoi={handleSelectPoi}
            onSelectVerse={openVerse}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {showDetails && !selectedPoi && (
          <LocationPanel
            location={selectedLocation}
            onClose={() => closePanel("details")}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelect}
            onSelectPoi={handleSelectPoi}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {noPanelsOpen && (
          <div className="all-closed-message">
            Everything's closed — reopen a panel from the ☰ menu.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
