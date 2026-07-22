import { useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import type { Session } from "@supabase/supabase-js";
import MapView from "./components/MapView";
import LayerControls from "./components/LayerControls";
import SearchBar from "./components/SearchBar";
import LocationPanel from "./components/LocationPanel";
import PoiPanel from "./components/PoiPanel";
import BiblePanel from "./components/BiblePanel";
import ThenNowToggle, { type MapMode } from "./components/ThenNowToggle";
import PanelMenu, { type PanelKey } from "./components/PanelMenu";
import MobileTabBar from "./components/MobileTabBar";
import ResizeHandle from "./components/ResizeHandle";
import AuthButton from "./components/AuthButton";
import { supabase } from "./lib/supabase";
import { locations } from "./data/locations";
import { pois } from "./data/pois";
import "./App.css";

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 800;
const MOBILE_QUERY = "(max-width: 768px)";

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [poisVisible, setPoisVisible] = useState(true);
  const [locationsVisible, setLocationsVisible] = useState(true);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("satellite");
  const [bibleReference, setBibleReference] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  // On mobile, exactly one panel is shown at a time (driven by the bottom tab bar) — default to
  // Bible. Desktop shows Bible+Map together by default.
  const [panels, setPanels] = useState<Record<PanelKey, boolean>>(() =>
    isMobile ? { map: false, details: false, bible: true } : { map: true, details: false, bible: true }
  );
  const [bibleWidth, setBibleWidth] = useState(340);
  const [detailsWidth, setDetailsWidth] = useState(380);
  const [session, setSession] = useState<Session | null>(null);
  const [restoreTranslation, setRestoreTranslation] = useState<string | undefined>(undefined);
  // Avoids re-yanking the reader back to their saved spot on every token refresh — only restore
  // once per signed-in user per app load.
  const restoredForUserId = useRef<string | null>(null);

  const selectedLocation = locations.find((l) => l.id === selectedId) ?? null;
  const selectedPoi = pois.find((p) => p.id === selectedPoiId) ?? null;

  const togglePanel = (key: PanelKey) => setPanels((p) => ({ ...p, [key]: !p[key] }));
  const openPanel = (key: PanelKey) => setPanels((p) => ({ ...p, [key]: true }));
  const closePanel = (key: PanelKey) => setPanels((p) => ({ ...p, [key]: false }));
  // Mobile has exactly one active panel at a time, switched via the bottom tab bar.
  const setMobileActivePanel = (key: PanelKey) =>
    setPanels({ map: key === "map", bible: key === "bible", details: key === "details" });
  // On mobile, closing the only-ever-open panel via its "×" would leave nothing open (with no
  // hamburger left to reopen one) — send the user back to the map instead of just closing.
  const handleClosePanel = (key: PanelKey) => (isMobile ? setMobileActivePanel("map") : closePanel(key));

  // Keep isMobile in sync with live resizes/rotations.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Whenever the viewport crosses into mobile width (e.g. a desktop window shrunk down),
  // collapse back to a single active panel, defaulting to Bible.
  useEffect(() => {
    if (isMobile) setMobileActivePanel("bible");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // On mobile the map stays mounted at all times (see mapMounted below) and is just hidden via
  // CSS while another tab is active, so switching back doesn't reload tiles/pins from scratch.
  // MapLibre measures its container in pixels, though, so a container that was `display: none`
  // needs an explicit resize() once it's visible again or it renders stale/blank.
  useEffect(() => {
    if (isMobile && panels.map) map?.resize();
  }, [isMobile, panels.map, map]);

  // Track the logged-in (or guest) session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Once per signed-in user, fetch their saved reading position and jump the Bible panel there.
  useEffect(() => {
    if (!session || restoredForUserId.current === session.user.id) return;
    restoredForUserId.current = session.user.id;
    supabase
      .from("reading_progress")
      .select("book,chapter,translation")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBibleReference(`${data.book} ${data.chapter}`);
        setRestoreTranslation(data.translation);
        if (isMobile) setMobileActivePanel("bible");
        else openPanel("bible");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null);
    setLocationsVisible(true);
    if (isMobile) {
      setMobileActivePanel("details");
    } else {
      openPanel("details");
      openPanel("map");
    }
  };

  const handleSelectPoi = (id: string) => {
    setSelectedPoiId(id);
    setSelectedId(null);
    if (isMobile) {
      setMobileActivePanel("details");
    } else {
      openPanel("details");
      openPanel("map");
    }
  };

  // Clicking a location/POI link inside the Bible text should just show it on the map — not jump
  // to the Details panel the way clicking a pin or a search result does.
  const handleSelectFromBible = (id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null);
    setLocationsVisible(true);
    if (isMobile) setMobileActivePanel("map");
    else openPanel("map");
  };

  const handleSelectPoiFromBible = (id: string) => {
    setSelectedPoiId(id);
    setSelectedId(null);
    if (isMobile) setMobileActivePanel("map");
    else openPanel("map");
  };

  const hasSelection = selectedId !== null || selectedPoiId !== null;
  const clearSelection = () => {
    setSelectedId(null);
    setSelectedPoiId(null);
    if (isMobile) setMobileActivePanel("map");
  };

  const openVerse = (reference: string) => {
    setBibleReference(reference);
    if (isMobile) {
      setMobileActivePanel("bible");
    } else {
      openPanel("bible");
    }
  };

  // The details panel has nothing to show without a selection on desktop — hiding it lets the
  // map expand instead of leaving a blank panel visible. On mobile it always renders (as its own
  // full-screen tab) so the empty state ("search or click a pin") shows instead of a blank tab.
  const showDetails = panels.details && (hasSelection || isMobile);
  const noPanelsOpen = !panels.bible && !panels.map && !showDetails;
  const sideExpand = !panels.map;
  const activeMobilePanel: PanelKey = panels.bible ? "bible" : panels.details ? "details" : "map";
  // On mobile, keep the map mounted even while another tab is active (hidden via CSS below)
  // instead of unmounting it, so MapLibre/tiles/pins survive tab switches.
  const mapMounted = panels.map || isMobile;
  const mapHiddenOnMobile = isMobile && !panels.map;

  return (
    <div className="app-shell">
      <header className="app-header">
        <PanelMenu panels={panels} onToggle={togglePanel} />
        <img src="/favicon.svg" className="app-logo" alt="" aria-hidden="true" />
        <h1>New Testament Biblical Atlas</h1>
        <SearchBar locations={locations} onSelect={handleSelect} />
        <AuthButton session={session} />
      </header>
      <div className="app-body">
        {panels.bible && (
          <BiblePanel
            reference={bibleReference}
            onClose={() => handleClosePanel("bible")}
            onSelectLocation={handleSelectFromBible}
            onSelectPoi={handleSelectPoiFromBible}
            expand={sideExpand}
            style={{ width: bibleWidth }}
            userId={session?.user.id}
            restoreTranslation={restoreTranslation}
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
        {mapMounted && (
          <div className={`map-area${mapHiddenOnMobile ? " map-area-hidden" : ""}`}>
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
              defaultMinimized={isMobile}
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
            onClose={() => handleClosePanel("details")}
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
            onClose={() => handleClosePanel("details")}
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
      {isMobile && (
        <MobileTabBar active={activeMobilePanel} hasSelection={hasSelection} onSelect={setMobileActivePanel} />
      )}
    </div>
  );
}

export default App;
