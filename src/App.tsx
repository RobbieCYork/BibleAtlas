import { useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import type { Session } from "@supabase/supabase-js";
import MapView from "./components/MapView";
import LayerControls from "./components/LayerControls";
import SearchBar from "./components/SearchBar";
import HeaderTextSearch from "./components/HeaderTextSearch";
import LocationPanel from "./components/LocationPanel";
import PoiPanel from "./components/PoiPanel";
import PersonPanel from "./components/PersonPanel";
import BiblePanel from "./components/BiblePanel";
import MyNotesPanel from "./components/MyNotesPanel";
import FriendsPanel from "./components/FriendsPanel";
import ThenNowToggle, { type MapMode } from "./components/ThenNowToggle";
import PanelMenu, { type PanelKey } from "./components/PanelMenu";
import MobileTabBar from "./components/MobileTabBar";
import ResizeHandle from "./components/ResizeHandle";
import AuthButton from "./components/AuthButton";
import DisplayNameGate from "./components/DisplayNameGate";
import ResetPasswordGate from "./components/ResetPasswordGate";
import { supabase } from "./lib/supabase";
import { locations } from "./data/locations";
import { pois } from "./data/pois";
import { people } from "./data/people";
import "./App.css";

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 800;
const MOBILE_QUERY = "(max-width: 768px)";

/** One entry in the details "back" trail — enough to restore a prior selection without re-deriving it. */
type DetailsSelection = { kind: "location"; id: string } | { kind: "poi"; id: string } | { kind: "person"; id: string };

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  // Tracks where the reader came from when they follow a cross-link *inside* the details panel (e.g.
  // Jesus's bio links to Nazareth) so a "Back" button can return them there. Only pushed to from those
  // in-panel cross-links — a fresh selection from the map, search, or Bible text clears the trail
  // instead, since that's a new starting point, not a continuation of the link chain.
  const [detailsHistory, setDetailsHistory] = useState<DetailsSelection[]>([]);
  const [poisVisible, setPoisVisible] = useState(true);
  const [locationsVisible, setLocationsVisible] = useState(true);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("satellite");
  const [bibleReference, setBibleReference] = useState<string | null>(null);
  // Bumped on every "go to this reference" call so BiblePanel's load effect re-fires even when the
  // reference string repeats a value already in state (e.g. re-clicking a note whose verse matches
  // the currently-restored position) — React skips effects when a same-value setState is a no-op.
  const [referenceNonce, setReferenceNonce] = useState(0);
  const goToReference = (ref: string) => {
    setBibleReference(ref);
    setReferenceNonce((n) => n + 1);
  };
  // Bumped whenever BiblePanel saves or deletes a note, so MyNotesPanel (which stays mounted on
  // mobile and only fetches on userId change) knows to refetch instead of showing stale data.
  const [notesVersion, setNotesVersion] = useState(0);
  // The header search bar swaps behavior by active panel — Map keeps its own autocomplete
  // component, Bible and Notes drive these instead (see the reference/referenceNonce comment above
  // for why Bible needs a nonce: it hits an external API on Enter, not on every keystroke).
  const [bibleSearchQuery, setBibleSearchQuery] = useState("");
  const [bibleSearchNonce, setBibleSearchNonce] = useState(0);
  const [notesSearchQuery, setNotesSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  // On mobile, exactly one panel is shown at a time (driven by the bottom tab bar) — default to
  // Bible. Desktop shows Bible+Map together by default.
  const [panels, setPanels] = useState<Record<PanelKey, boolean>>(() =>
    isMobile
      ? { map: false, details: false, bible: true, notes: false, friends: false }
      : { map: true, details: false, bible: true, notes: false, friends: false }
  );
  const [bibleWidth, setBibleWidth] = useState(340);
  const [detailsWidth, setDetailsWidth] = useState(380);
  const [notesWidth] = useState(380);
  const [friendsWidth] = useState(380);
  const [session, setSession] = useState<Session | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [restoreTranslation, setRestoreTranslation] = useState<string | undefined>(undefined);
  // Avoids re-yanking the reader back to their saved spot on every token refresh — only restore
  // once per signed-in user per app load.
  const restoredForUserId = useRef<string | null>(null);

  const selectedLocation = locations.find((l) => l.id === selectedId) ?? null;
  const selectedPoi = pois.find((p) => p.id === selectedPoiId) ?? null;
  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;
  // Mirrors the precedence used below when deciding which detail panel to render (person > POI > location).
  const currentDetailsSelection: DetailsSelection | null = selectedPersonId
    ? { kind: "person", id: selectedPersonId }
    : selectedPoiId
      ? { kind: "poi", id: selectedPoiId }
      : selectedId
        ? { kind: "location", id: selectedId }
        : null;

  // Desktop panels are opened/closed solely via the hamburger checklist now (no more per-panel "×")
  // — with up to 5 panels available, letting them all pile up open at once gets cramped fast, so
  // opening a 4th auto-closes whichever open panel has gone longest without being opened or reselected.
  // Recency order, most-recently-opened/touched last; mobile never consults this (it's always exactly
  // one panel via the tab bar) so it only needs to track truth for desktop.
  const MAX_OPEN_PANELS = 3;
  const panelOrderRef = useRef<PanelKey[]>(["map", "bible"]);
  const touchPanelOrder = (key: PanelKey) => {
    panelOrderRef.current = [...panelOrderRef.current.filter((k) => k !== key), key];
  };

  const openPanel = (key: PanelKey) => {
    touchPanelOrder(key);
    setPanels((p) => {
      if (p[key]) return p;
      const openKeys = (Object.keys(p) as PanelKey[]).filter((k) => p[k]);
      if (openKeys.length < MAX_OPEN_PANELS) return { ...p, [key]: true };
      const lru = panelOrderRef.current.find((k) => k !== key && openKeys.includes(k));
      return lru ? { ...p, [key]: true, [lru]: false } : { ...p, [key]: true };
    });
  };
  const closePanel = (key: PanelKey) => {
    panelOrderRef.current = panelOrderRef.current.filter((k) => k !== key);
    setPanels((p) => ({ ...p, [key]: false }));
  };
  const togglePanel = (key: PanelKey) => (panels[key] ? closePanel(key) : openPanel(key));
  // Mobile has exactly one active panel at a time, switched via the bottom tab bar.
  const setMobileActivePanel = (key: PanelKey) =>
    setPanels({
      map: key === "map",
      bible: key === "bible",
      details: key === "details",
      notes: key === "notes",
      friends: key === "friends",
    });

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

  // Track the logged-in (or guest) session. Supabase's confirmation/magic-link/reset emails use the
  // PKCE flow, which lands back here with a `?code=...` query param rather than the older `#access_
  // token=...` hash — the client only auto-detects the hash style, so a `code` param has to be
  // exchanged for a session explicitly or the link silently does nothing (looks "logged out" even
  // though the email really was confirmed on Supabase's side).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(window.location.href).finally(() => {
        window.history.replaceState({}, "", window.location.pathname);
      });
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // A friend's "Copy invite link" produces a URL like "?invite=<their user id>". Save it to
  // localStorage (not just read from the URL) because a brand-new visitor has to sign up and click
  // an email confirmation link before they have a real session — and that confirmation redirect goes
  // to the bare site origin, dropping any query string along the way. Persisting it here means the
  // invite still applies once they finally do get a session, however many steps later that is.
  useEffect(() => {
    const inviterId = new URLSearchParams(window.location.search).get("invite");
    if (inviterId) {
      localStorage.setItem("pending-invite-from", inviterId);
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  // Once a real (non-guest) session exists, apply any pending invite — sending a friend request from
  // the inviter rather than requiring the new user to manually look them up. Silently no-ops if
  // they're already connected (e.g. the invite link was opened more than once).
  useEffect(() => {
    if (!session || session.user.is_anonymous) return;
    const inviterId = localStorage.getItem("pending-invite-from");
    if (!inviterId || inviterId === session.user.id) {
      if (inviterId) localStorage.removeItem("pending-invite-from");
      return;
    }
    supabase
      .from("friend_requests")
      .insert({ sender_id: inviterId, receiver_id: session.user.id, status: "pending" })
      .then(() => {
        localStorage.removeItem("pending-invite-from");
      });
  }, [session]);

  // Same pending-through-signup persistence as the friend invite link above, for a group's "Copy
  // invite link" (?joinGroup=<group id>) — except this always creates a pending join_request rather
  // than membership outright, since a group invite link might get forwarded around and shouldn't let
  // just anyone in without an admin's OK.
  useEffect(() => {
    const groupId = new URLSearchParams(window.location.search).get("joinGroup");
    if (groupId) {
      localStorage.setItem("pending-join-group", groupId);
      const url = new URL(window.location.href);
      url.searchParams.delete("joinGroup");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (!session || session.user.is_anonymous) return;
    const groupId = localStorage.getItem("pending-join-group");
    if (!groupId) return;
    supabase.rpc("request_to_join_group", { p_group_id: groupId }).then(() => {
      localStorage.removeItem("pending-join-group");
    });
  }, [session]);

  // Pending incoming friend requests — badges the Friends entry point (mobile "More" tab, desktop
  // panel menu) so a new request is noticeable without opening the Friends panel first. Refetches
  // live via Realtime rather than polling, since friend_requests changes are rare.
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  useEffect(() => {
    if (!session || session.user.is_anonymous) {
      setPendingFriendRequests(0);
      return;
    }
    const userId = session.user.id;
    const fetchCount = () => {
      supabase
        .from("friend_requests")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .then(({ count }) => setPendingFriendRequests(count ?? 0));
    };
    fetchCount();
    const channel = supabase
      .channel(`friend-requests-badge-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, fetchCount)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Unread messages — same badging approach as pendingFriendRequests above, shown on the Messages
  // entry point specifically (friend requests and unread messages are counted separately so each
  // entry point's badge reflects only what it leads to).
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    if (!session || session.user.is_anonymous) {
      setUnreadMessages(0);
      return;
    }
    const userId = session.user.id;
    const fetchCount = () => {
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .is("read_at", null)
        .then(({ count }) => setUnreadMessages(count ?? 0));
    };
    fetchCount();
    const channel = supabase
      .channel(`messages-badge-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchCount)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Unread group messages plus pending join requests you can approve — same badging approach again,
  // combined into one number since both are "something in Groups needs your attention" the same way
  // an unread message and an incoming friend request both mean "something in Friends needs you."
  const [groupsBadgeCount, setGroupsBadgeCount] = useState(0);
  useEffect(() => {
    if (!session || session.user.is_anonymous) {
      setGroupsBadgeCount(0);
      return;
    }
    const userId = session.user.id;
    const fetchCount = () => {
      Promise.all([supabase.rpc("count_unread_group_messages"), supabase.rpc("count_pending_group_join_requests")]).then(
        ([unread, pending]) => setGroupsBadgeCount((unread.data ?? 0) + (pending.data ?? 0))
      );
    };
    fetchCount();
    const channel = supabase
      .channel(`groups-badge-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_messages" }, fetchCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, fetchCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_join_requests" }, fetchCount)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Which top-level view the Friends panel should jump to when opened from the mobile "More" sheet
  // (Friends, Messages, or Groups) — nonce increments on every tap so re-selecting the same view
  // while the panel is already open still resets it to that view's list (rather than a no-op).
  const [friendsView, setFriendsView] = useState<"friends" | "messages" | "groups">("friends");
  const [friendsViewNonce, setFriendsViewNonce] = useState(0);
  // Lets the mobile "More" sheet's "My Profile" entry pop open the account menu's Settings view —
  // stays undefined until first triggered so AuthButton's effect doesn't fire (and pop the menu open)
  // on initial mount.
  const [openProfileNonce, setOpenProfileNonce] = useState<number | undefined>(undefined);
  /** Shared by the mobile "More" sheet and the in-panel view switcher (so it works on desktop too,
   * where there's no "More" sheet to reach Messages/Groups from otherwise). */
  const handleSelectFriendsView = (targetView: "friends" | "messages" | "groups") => {
    setFriendsView(targetView);
    setFriendsViewNonce((n) => n + 1);
  };

  // Every real account needs a display name (new signups set one in the form itself). This catches
  // accounts created before that field existed and blocks the app with DisplayNameGate until they
  // set one — checked once per session, not re-fetched after DisplayNameGate reports success (it
  // updates this state directly instead).
  const [needsDisplayName, setNeedsDisplayName] = useState(false);
  useEffect(() => {
    if (!session || session.user.is_anonymous) {
      setNeedsDisplayName(false);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setNeedsDisplayName(!(data as { display_name: string | null } | null)?.display_name);
      });
  }, [session]);

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
        goToReference(`${data.book} ${data.chapter}`);
        setRestoreTranslation(data.translation);
        if (isMobile) setMobileActivePanel("bible");
        else openPanel("bible");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
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
    setSelectedPersonId(null);
    if (isMobile) {
      setMobileActivePanel("details");
    } else {
      openPanel("details");
      openPanel("map");
    }
  };

  // People don't have a map presence — selecting one (from Bible text, search, or a cross-link in
  // another detail panel) just opens the Details panel, without touching the map at all.
  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    setSelectedId(null);
    setSelectedPoiId(null);
    if (isMobile) setMobileActivePanel("details");
    else openPanel("details");
  };

  // Shows a location on the map without opening the Details panel — used for the Bible text's
  // location links and the map search bar, where the reader wants to see *where* a place is first;
  // clicking the pin itself (handleSelectFromMap) is what opens the full write-up.
  const focusLocationOnMap = (id: string) => {
    setDetailsHistory([]);
    setSelectedId(id);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setLocationsVisible(true);
    if (isMobile) setMobileActivePanel("map");
    else openPanel("map");
  };

  const handleSelectPoiFromBible = (id: string) => {
    setDetailsHistory([]);
    setSelectedPoiId(id);
    setSelectedId(null);
    setSelectedPersonId(null);
    if (isMobile) setMobileActivePanel("map");
    else openPanel("map");
  };

  // A person link inside the Bible text does jump to the Details panel (people have no map presence
  // to show instead) — still a fresh starting point, so it clears the back trail like the two above.
  const handleSelectPersonFromBible = (id: string) => {
    setDetailsHistory([]);
    handleSelectPerson(id);
  };

  // Map pins and search results are also fresh starting points, not a continuation of an in-panel
  // link chain — clear the back trail so a stale "Back" button doesn't linger.
  const handleSelectFromMap = (id: string) => {
    setDetailsHistory([]);
    handleSelect(id);
  };
  const handleSelectPoiFromMap = (id: string) => {
    setDetailsHistory([]);
    handleSelectPoi(id);
  };

  // Cross-links *inside* a details panel (e.g. a person's bio linking to where they lived) push the
  // selection being left behind onto the back trail before switching, so "Back" can return to it.
  const handleSelectLocationFromDetails = (id: string) => {
    if (currentDetailsSelection) setDetailsHistory((h) => [...h, currentDetailsSelection]);
    handleSelect(id);
  };
  const handleSelectPoiFromDetails = (id: string) => {
    if (currentDetailsSelection) setDetailsHistory((h) => [...h, currentDetailsSelection]);
    handleSelectPoi(id);
  };
  const handleSelectPersonFromDetails = (id: string) => {
    if (currentDetailsSelection) setDetailsHistory((h) => [...h, currentDetailsSelection]);
    handleSelectPerson(id);
  };

  const goBackInDetails = () => {
    if (detailsHistory.length === 0) return;
    const prev = detailsHistory[detailsHistory.length - 1];
    setDetailsHistory((h) => h.slice(0, -1));
    if (prev.kind === "location") handleSelect(prev.id);
    else if (prev.kind === "poi") handleSelectPoi(prev.id);
    else handleSelectPerson(prev.id);
  };

  const hasSelection = selectedId !== null || selectedPoiId !== null || selectedPersonId !== null;
  const clearSelection = () => {
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setDetailsHistory([]);
    if (isMobile) setMobileActivePanel("map");
  };

  const openVerse = (reference: string) => {
    goToReference(reference);
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
  const noPanelsOpen = !panels.bible && !panels.map && !panels.notes && !panels.friends && !showDetails;
  const sideExpand = !panels.map;
  const activeMobilePanel: PanelKey = panels.bible
    ? "bible"
    : panels.details
      ? "details"
      : panels.notes
        ? "notes"
        : panels.friends
          ? "friends"
          : "map";
  // On mobile, keep the map mounted even while another tab is active (hidden via CSS below)
  // instead of unmounting it, so MapLibre/tiles/pins survive tab switches.
  const mapMounted = panels.map || isMobile;
  const mapHiddenOnMobile = isMobile && !panels.map;
  // Same reasoning for the Bible panel — it holds its own book/chapter/search state locally, which
  // would otherwise reset every time the reader switched to another tab and back.
  const bibleMounted = panels.bible || isMobile;
  const bibleHiddenOnMobile = isMobile && !panels.bible;
  const notesMounted = panels.notes || isMobile;
  const notesHiddenOnMobile = isMobile && !panels.notes;
  const friendsMounted = panels.friends || isMobile;
  const friendsHiddenOnMobile = isMobile && !panels.friends;
  // Which panel the header search bar serves — each panel gets its own search behavior (Map flies to
  // a location, Bible runs a word/phrase search, Notes filters live) rather than one generic bar, so
  // only one can be "active" at a time. On desktop, where Bible+Map are often open together, Map
  // wins ties (unchanged from the original map-only behavior) since it's the more common case.
  const searchMode: "map" | "bible" | "notes" | null = isMobile
    ? activeMobilePanel === "map" || activeMobilePanel === "bible" || activeMobilePanel === "notes"
      ? activeMobilePanel
      : null
    : panels.map
      ? "map"
      : panels.bible
        ? "bible"
        : panels.notes
          ? "notes"
          : null;

  const goHome = () => {
    if (isMobile) setMobileActivePanel("bible");
    else openPanel("bible");
  };

  return (
    <div className="app-shell">
      {passwordRecovery && session && <ResetPasswordGate onDone={() => setPasswordRecovery(false)} />}
      {!passwordRecovery && needsDisplayName && session && (
        <DisplayNameGate userId={session.user.id} onSaved={() => setNeedsDisplayName(false)} />
      )}
      <header className="app-header">
        <PanelMenu panels={panels} onToggle={togglePanel} friendsBadgeCount={pendingFriendRequests + unreadMessages + groupsBadgeCount} />
        <button type="button" className="app-logo-button" onClick={goHome} aria-label="Go to Bible">
          <img src="/favicon.svg" className="app-logo" alt="" aria-hidden="true" />
        </button>
        <h1>New Testament Biblical Atlas</h1>
        {searchMode === "map" && <SearchBar locations={locations} onSelect={focusLocationOnMap} />}
        {searchMode === "bible" && (
          <HeaderTextSearch
            placeholder="Search the Bible"
            value={bibleSearchQuery}
            onChange={setBibleSearchQuery}
            onSubmit={() => setBibleSearchNonce((n) => n + 1)}
          />
        )}
        {searchMode === "notes" && (
          <HeaderTextSearch placeholder="Search My Notes" value={notesSearchQuery} onChange={setNotesSearchQuery} />
        )}
        <AuthButton session={session} openSettingsNonce={openProfileNonce} />
      </header>
      <div className="app-body">
        {bibleMounted && (
          <BiblePanel
            reference={bibleReference}
            referenceNonce={referenceNonce}
            onSelectLocation={focusLocationOnMap}
            onSelectPoi={handleSelectPoiFromBible}
            onSelectPerson={handleSelectPersonFromBible}
            expand={sideExpand}
            style={{ width: bibleWidth }}
            userId={session?.user.id}
            restoreTranslation={restoreTranslation}
            hidden={bibleHiddenOnMobile}
            onNotesChanged={() => setNotesVersion((n) => n + 1)}
            externalSearchQuery={bibleSearchQuery}
            externalSearchNonce={bibleSearchNonce}
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
              onSelect={handleSelectFromMap}
              onMapLoad={setMap}
              mapMode={mapMode}
              locationsVisible={locationsVisible}
              pois={pois}
              poisVisible={poisVisible}
              selectedPoiId={selectedPoiId}
              onSelectPoi={handleSelectPoiFromMap}
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
            <div className="map-hint">Click a pin for more details</div>
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
        {showDetails && selectedPerson && (
          <PersonPanel
            person={selectedPerson}
            onBack={detailsHistory.length > 0 ? goBackInDetails : undefined}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {showDetails && !selectedPerson && selectedPoi && (
          <PoiPanel
            poi={selectedPoi}
            onBack={detailsHistory.length > 0 ? goBackInDetails : undefined}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectVerse={openVerse}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {showDetails && !selectedPerson && !selectedPoi && (
          <LocationPanel
            location={selectedLocation}
            onBack={detailsHistory.length > 0 ? goBackInDetails : undefined}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {notesMounted && (
          <MyNotesPanel
            userId={session?.user.id}
            onGoToVerse={openVerse}
            expand={sideExpand}
            style={{ width: notesWidth }}
            hidden={notesHiddenOnMobile}
            refreshKey={notesVersion}
            searchQuery={notesSearchQuery}
          />
        )}
        {friendsMounted && (
          <FriendsPanel
            session={session}
            expand={sideExpand}
            style={{ width: friendsWidth }}
            hidden={friendsHiddenOnMobile}
            openView={friendsView}
            openViewNonce={friendsViewNonce}
            onSelectView={handleSelectFriendsView}
            friendsBadgeCount={pendingFriendRequests}
            messagesBadgeCount={unreadMessages}
            groupsBadgeCount={groupsBadgeCount}
          />
        )}
        {noPanelsOpen && (
          <div className="all-closed-message">
            Everything's closed — reopen a panel from the ☰ menu.
          </div>
        )}
      </div>
      {isMobile && (
        <MobileTabBar
          active={activeMobilePanel}
          hasSelection={hasSelection}
          onSelect={(key, view) => {
            if (key === "friends" && view) handleSelectFriendsView(view);
            setMobileActivePanel(key);
          }}
          friendsBadgeCount={pendingFriendRequests}
          messagesBadgeCount={unreadMessages}
          groupsBadgeCount={groupsBadgeCount}
          onOpenProfile={() => setOpenProfileNonce((n) => (n ?? 0) + 1)}
        />
      )}
    </div>
  );
}

export default App;
