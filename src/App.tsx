import { useEffect, useMemo, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import type { Session } from "@supabase/supabase-js";
import MapView from "./components/MapView";
import LayerControls from "./components/LayerControls";
import SearchBar from "./components/SearchBar";
import HeaderTextSearch from "./components/HeaderTextSearch";
import { completionTail, suggestReference } from "./lib/bibleReference";
import TimelineSearchBar from "./components/TimelineSearchBar";
import LocationPanel from "./components/LocationPanel";
import PoiPanel from "./components/PoiPanel";
import PersonPanel from "./components/PersonPanel";
import TopicPanel from "./components/TopicPanel";
import TimelineEventPanel from "./components/TimelineEventPanel";
import TimelineView, { type View as TimelineViewState } from "./components/TimelineView";
import { TimelineLinkContext } from "./components/LinkChoicePopup";
import type { TimelineLinkHandlers } from "./components/LinkChoicePopup";
import BiblePanel from "./components/BiblePanel";
import MyNotesPanel from "./components/MyNotesPanel";
import ArticlesPanel from "./components/ArticlesPanel";
import FriendsPanel from "./components/FriendsPanel";
import ThenNowToggle, { type MapMode } from "./components/ThenNowToggle";
import PanelMenu, { type PanelKey } from "./components/PanelMenu";
import MobileTabBar from "./components/MobileTabBar";
import ResizeHandle from "./components/ResizeHandle";
import AuthButton from "./components/AuthButton";
import MyProfileView from "./components/MyProfileView";
import FriendProfileView from "./components/FriendProfileView";
import PeopleSearchBar from "./components/PeopleSearchBar";
import NotificationToasts from "./components/NotificationToasts";
import GameView from "./components/GameView";
import BackButton from "./components/BackButton";
import DisplayNameGate from "./components/DisplayNameGate";
import ResetPasswordGate from "./components/ResetPasswordGate";
import AuthGate from "./components/AuthGate";
import { supabase, setRememberMe } from "./lib/supabase";
import {
  clearRememberedSelection,
  installSelectionCapture,
  type ReportSurface,
  type ReportTarget,
} from "./lib/reportContext";
import { useMobileTabs, type MobileTabKey } from "./lib/mobileTabs";
import MobileNavMenu from "./components/MobileNavMenu";
import { startAnalytics, track, noteAuthChange } from "./lib/analytics";
import { locations } from "./data/locations";
import { pois } from "./data/pois";
import { people } from "./data/people";
import { topics } from "./data/topics";
import { timelineEvents } from "./data/timelineEvents";
import { formatWalkStopReference, getActiveSeasonalWalk, getWalkDismissKey } from "./data/seasonalWalks";
import SeasonalWalkPanel from "./components/SeasonalWalkPanel";
import Icon from "./components/Icon";
import "./App.css";

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 800;
const MOBILE_QUERY = "(max-width: 768px)";

/** One entry in the details "back" trail — enough to restore a prior selection without re-deriving it.
 * The "timeline" variant is different from the rest: it doesn't restore a *selection*, it restores
 * Timeline mode itself (the full-screen takeover) at the exact pan/zoom view the reader left behind
 * when they followed a cross-link out of it (event article, Lifespans bar, or Books band). */
type DetailsSelection =
  | { kind: "location"; id: string }
  | { kind: "poi"; id: string }
  | { kind: "person"; id: string }
  | { kind: "topic"; id: string }
  | { kind: "timelineEvent"; id: string }
  | { kind: "timeline"; view: TimelineViewState };

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<string | null>(null);
  // Tracks where the reader came from when they follow a cross-link *inside* the details panel (e.g.
  // Jesus's bio links to Nazareth) so a "Back" button can return them there. Only pushed to from those
  // in-panel cross-links — a fresh selection from the map, search, or Bible text clears the trail
  // instead, since that's a new starting point, not a continuation of the link chain.
  const [detailsHistory, setDetailsHistory] = useState<DetailsSelection[]>([]);
  // Mobile only: which tab was active right before a pin/link tap switched to the Details tab (which
  // has no tab-bar entry of its own — see MobileTabBar) — lets the details article's Back button
  // return to wherever the reader actually came from instead of always landing on the map.
  const [detailsReturnPanel, setDetailsReturnPanel] = useState<PanelKey>("map");
  const [poisVisible, setPoisVisible] = useState(true);
  const [locationsVisible, setLocationsVisible] = useState(true);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  // Default to the street "Map" (vector) style — a cold load straight into Satellite shows a
  // blank pane until imagery arrives, which reads as broken rather than loading.
  const [mapMode, setMapMode] = useState<MapMode>("vector");
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
  // The reference the Bible box appears to be heading for, and the unwritten tail of it drawn in
  // grey after the cursor. Derived, never stored — it is a function of the query and nothing else,
  // so there is no second copy of the truth to keep in step. BiblePanel resolves the same query
  // independently when the search is actually submitted; this exists only to show it coming.
  const bibleSuggestion = suggestReference(bibleSearchQuery);
  const bibleCompletion = completionTail(bibleSearchQuery, bibleSuggestion);
  const [notesSearchQuery, setNotesSearchQuery] = useState("");
  // Explicit scope for the header's shared search box, for the one case where it's genuinely
  // ambiguous: desktop with both the Bible and Map panels open at once. Always starts on
  // "scripture" on a fresh load/app start (never persisted) — see the searchMode/toggle logic
  // below for how this is kept in sync with the mobile tab bar instead of shown as a control there.
  const [searchScope, setSearchScope] = useState<"scripture" | "places">("scripture");
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  // On mobile, exactly one panel is shown at a time (driven by the bottom tab bar) — default to
  // Bible. Desktop shows Bible+Map together by default.
  const [panels, setPanels] = useState<Record<PanelKey, boolean>>(() =>
    isMobile
      ? { map: false, bible: true, notes: false, friends: false, articles: false }
      : { map: true, bible: true, notes: false, friends: false, articles: false }
  );
  // Default desktop split: Bible panel gets 1/3 of the width, map gets the remaining 2/3 (map
  // fills via flex:1 in .app-body, so only the Bible panel's width needs to be set). Clamped to
  // the same [MIN_PANEL_WIDTH, MAX_PANEL_WIDTH] range the resize handle itself enforces. Mobile
  // ignores this value entirely (panels go full-width via .panel-expand), so it's fine to compute
  // it unconditionally from the initial viewport width.
  const [bibleWidth, setBibleWidth] = useState(() =>
    Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(window.innerWidth / 3)))
  );
  const [notesWidth] = useState(380);
  const [friendsWidth] = useState(380);
  // One width for the Articles slot, whichever of its two states is showing (browse list or an open
  // article) — they're the same panel, so a width set while browsing must survive opening an article.
  const [articlesWidth, setArticlesWidth] = useState(380);
  const [session, setSession] = useState<Session | null>(null);
  // True once the initial supabase.auth.getSession() call has settled (whether or not it found a
  // session) — `session` alone can't tell "haven't checked yet" apart from "genuinely logged out",
  // and BiblePanel's cold-start welcome screen needs that distinction (see bibleInitializing below).
  const [authResolved, setAuthResolved] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  // True for the brief window a `?code=...` password-reset link is being exchanged for a session
  // (see the effect below). getSession() below can resolve with no session first, since the
  // exchange is a separate in-flight request — without this, AuthGate would flash on top of a
  // signed-out-looking screen for a visitor who is, in fact, mid-recovery. Starts true only when
  // the param is actually present, so it's a no-op for every other page load.
  const [exchangingRecoveryCode, setExchangingRecoveryCode] = useState(
    () => !!new URLSearchParams(window.location.search).get("code")
  );
  const [restoreTranslation, setRestoreTranslation] = useState<string | undefined>(undefined);
  // Avoids re-yanking the reader back to their saved spot on every token refresh — only restore
  // once per signed-in user per app load.
  const restoredForUserId = useRef<string | null>(null);
  // True once the saved-reading-position lookup below has settled for the current session (or
  // immediately, if there's no session to look one up for) — see bibleInitializing.
  const [restoreChecked, setRestoreChecked] = useState(false);

  const selectedLocation = locations.find((l) => l.id === selectedId) ?? null;
  const selectedPoi = pois.find((p) => p.id === selectedPoiId) ?? null;
  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;
  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;
  const selectedTimelineEvent = timelineEvents.find((e) => e.id === selectedTimelineEventId) ?? null;
  // Mirrors the precedence used below when deciding which detail panel to render
  // (person > POI > topic > timeline event > location).
  const currentDetailsSelection: DetailsSelection | null = selectedPersonId
    ? { kind: "person", id: selectedPersonId }
    : selectedPoiId
      ? { kind: "poi", id: selectedPoiId }
      : selectedTopicId
        ? { kind: "topic", id: selectedTopicId }
        : selectedTimelineEventId
          ? { kind: "timelineEvent", id: selectedTimelineEventId }
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
  // Mirrors `panels` so chained open/close calls inside one event handler (e.g. handleSelect opening
  // details then map) each see the previous call's result — and so openPanel knows *synchronously*
  // which panel the LRU cap evicted, to surface it in the hamburger menu instead of a silent flip.
  // Every write to `panels` must go through applyPanels to keep the mirror honest.
  const panelsRef = useRef(panels);
  const applyPanels = (next: Record<PanelKey, boolean>) => {
    panelsRef.current = next;
    setPanels(next);
  };
  // The panel most recently auto-closed by the LRU cap — PanelMenu briefly names it in its caption,
  // so a checkbox flipping off on its own reads as "made room," not a misclick. The nonce makes
  // back-to-back evictions of the same panel still restart PanelMenu's notice timer.
  const [lastAutoClosed, setLastAutoClosed] = useState<{ key: PanelKey; nonce: number } | null>(null);

  const openPanel = (key: PanelKey) => {
    touchPanelOrder(key);
    const p = panelsRef.current;
    if (p[key]) return;
    // Feature-usage capture: which panels actually get opened. Only on a real
    // open (the early return above means re-selecting an already-open panel
    // isn't counted), and only the panel's own key — never what's inside it.
    track("panel.open", { panel: key });
    const openKeys = (Object.keys(p) as PanelKey[]).filter((k) => p[k]);
    if (openKeys.length < MAX_OPEN_PANELS) {
      applyPanels({ ...p, [key]: true });
      return;
    }
    const lru = panelOrderRef.current.find((k) => k !== key && openKeys.includes(k));
    applyPanels(lru ? { ...p, [key]: true, [lru]: false } : { ...p, [key]: true });
    if (lru) setLastAutoClosed((prev) => ({ key: lru, nonce: (prev?.nonce ?? 0) + 1 }));
  };
  const closePanel = (key: PanelKey) => {
    panelOrderRef.current = panelOrderRef.current.filter((k) => k !== key);
    applyPanels({ ...panelsRef.current, [key]: false });
  };
  /** Which single panel mobile is showing, derived from a panels record. Handlers that can be
   * invoked from a stale closure must read this off `panelsRef.current` rather than the
   * render-scoped `activeMobilePanel` below: MapView attaches its pin-click listeners once, in a
   * mount-only effect, so a pin tap runs the first render's copy of whatever handler it was handed
   * — which would otherwise report "bible" (the cold-start tab) forever. */
  const mobilePanelOf = (p: Record<PanelKey, boolean>): PanelKey =>
    p.bible ? "bible" : p.notes ? "notes" : p.friends ? "friends" : p.articles ? "articles" : "map";
  // Mobile has exactly one active panel at a time, switched via the bottom tab bar.
  const setMobileActivePanel = (key: PanelKey) => {
    // Mobile's counterpart to openPanel's tracking above — the tab bar swaps the
    // single active panel rather than going through openPanel, so it has to
    // report for itself. Guarded on an actual change so a tap on the tab you're
    // already standing on doesn't inflate the count.
    if (!panelsRef.current[key]) track("panel.open", { panel: key });
    return applyPanels({
      map: key === "map",
      bible: key === "bible",
      notes: key === "notes",
      friends: key === "friends",
      articles: key === "articles",
    });
  };

  // Keep isMobile in sync with live resizes/rotations.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Whenever the viewport crosses into mobile width (e.g. a desktop window shrunk down),
  // collapse back to a single active panel, defaulting to Bible. Crossing back out of mobile
  // must restore the desktop default pair (plus whichever panel mobile had active) — without
  // this the Map panel stays closed forever after a mobile→desktop transition.
  useEffect(() => {
    if (isMobile) {
      setMobileActivePanel("bible");
      return;
    }
    const p = panelsRef.current;
    const active = (Object.keys(p) as PanelKey[]).find((k) => p[k]);
    const next: Record<PanelKey, boolean> = {
      map: true,
      bible: true,
      notes: false,
      friends: false,
      articles: false,
    };
    if (active) next[active] = true;
    panelOrderRef.current = (Object.keys(next) as PanelKey[]).filter((k) => next[k]);
    applyPanels(next);
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
        setExchangingRecoveryCode(false);
      });
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthResolved(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Flush across the auth boundary so the events either side of a sign-in land with the
      // right attribution, and the session row picks up its user_id on the next touch.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") noteAuthChange();
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Usage analytics: starts the session, the flush timer and the time-on-site heartbeat.
  // Everything it does is fire-and-forget and failure-silent — see src/lib/analytics.ts.
  useEffect(() => startAnalytics(), []);

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
  // Lets the mobile "More" sheet's "My Profile" entry pop open the full-screen My Profile view (or,
  // for a guest with no profile page, the account menu's Settings view instead — see AuthButton's
  // effect) — stays undefined until first triggered so mounting doesn't pop anything open unprompted.
  const [openProfileNonce, setOpenProfileNonce] = useState<number | undefined>(undefined);
  // Lets the mobile "More" sheet's "Reading Plans" entry and the desktop account-menu equivalent
  // pop the Bible panel straight to its Reading Plans view — stays undefined until first triggered,
  // same reasoning as openProfileNonce above.
  const [openReadingPlansNonce, setOpenReadingPlansNonce] = useState<number | undefined>(undefined);
  const openReadingPlans = () => {
    if (isMobile) setMobileActivePanel("bible");
    setOpenReadingPlansNonce((n) => (n ?? 0) + 1);
  };
  // Lets the Timeline's Books-of-the-Bible band jump straight to a book's Introduction (instead of
  // its chapter 1) — same one-shot-request shape as journalRequest, carrying which book since that
  // varies per click, not just a bare nonce.
  const [openBookIntroRequest, setOpenBookIntroRequest] = useState<{ book: string; nonce: number } | null>(
    null,
  );

  // --- My Profile mode ----------------------------------------------------------------------------
  // Full-screen "My Profile" (MyProfileView), same top-level takeover pattern as Timeline mode below:
  // a boolean here renders it over the whole app-body, with its own header and Back button, entered
  // from the desktop account menu or the mobile "More" sheet's "My Profile" entry (both via AuthButton)
  // and left via its own Back button — replaces the small anchored dropdown this used to be.
  const [showMyProfile, setShowMyProfile] = useState(false);
  // Someone picked out of My Profile mode's header people-search (see PeopleSearchBar / searchMode
  // below): their read-only profile takes over the same area, with its own Back button returning to
  // the reader's own profile. Kept here rather than inside MyProfileView because the search that
  // sets it lives in the app header, which MyProfileView doesn't own.
  const [viewedPersonId, setViewedPersonId] = useState<string | null>(null);
  const openMyProfile = () => {
    track("panel.open", { panel: "profile" });
    setViewedPersonId(null);
    setShowMyProfile(true);
  };
  const closeMyProfile = () => {
    setViewedPersonId(null);
    setShowMyProfile(false);
  };
  // Bumped whenever MyProfileView saves a display-name change, so AuthButton's own fetch (which only
  // otherwise re-runs on a session change) knows to refresh the label it shows.
  const [profileVersion, setProfileVersion] = useState(0);

  // --- Games mode ----------------------------------------------------------------------------------
  // Full-screen multiplayer trivia (GameView), same top-level takeover pattern as Timeline/My Profile
  // above — video tiles and the buzzer UI need real screen space, not a squeezed 240–800px side panel.
  const [showGame, setShowGame] = useState(false);
  // Bumped whenever the Games entry point is tapped while Games mode is ALREADY showing — GameView
  // treats that as "take me back to Game Center" (see its own gameCenterNonce prop), the same way
  // tapping an already-active tab in many apps returns to that tab's root instead of doing nothing.
  // Tapping the entry point when Games *isn't* showing yet just resumes wherever the player left off
  // (GameView's own sessionStorage-backed state), same as before.
  const [gameCenterNonce, setGameCenterNonce] = useState(0);
  const openGame = () => {
    // See the matching comment in openTimeline below — same same-z-index takeover, same fix.
    const wasAlreadyShowing = showGame;
    closeTimeline();
    closeMyProfile();
    if (!wasAlreadyShowing) track("panel.open", { panel: "games" });
    setShowGame(true);
    if (wasAlreadyShowing) setGameCenterNonce((n) => n + 1);
  };
  const closeGame = () => setShowGame(false);
  /** Shared by the mobile "More" sheet and the in-panel view switcher (so it works on desktop too,
   * where there's no "More" sheet to reach Messages/Groups from otherwise). */
  const handleSelectFriendsView = (targetView: "friends" | "messages" | "groups") => {
    setFriendsView(targetView);
    setFriendsViewNonce((n) => n + 1);
  };
  /** My Profile's Friends/Messages/Groups links (and tapping a NotificationToasts banner) — leave
   * whatever full-screen mode is showing, same as the mobile tab bar's own panel-switching does, then
   * open Friends to the requested list. */
  const openFriendsFromProfile = (targetView: "friends" | "messages" | "groups") => {
    closeMyProfile();
    closeTimeline();
    closeGame();
    if (isMobile) setMobileActivePanel("friends");
    else openPanel("friends");
    handleSelectFriendsView(targetView);
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
  // Gated on authResolved so this doesn't fire (and mark restoreChecked) against the transient
  // `session === null` App starts with before the initial getSession() call has actually settled.
  useEffect(() => {
    if (!authResolved) return;
    if (!session) {
      setRestoreChecked(true);
      return;
    }
    if (restoredForUserId.current === session.user.id) return;
    restoredForUserId.current = session.user.id;
    supabase
      .from("reading_progress")
      .select("book,chapter,translation")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          goToReference(`${data.book} ${data.chapter}`);
          setRestoreTranslation(data.translation);
          if (isMobile) setMobileActivePanel("bible");
          else openPanel("bible");
        }
        setRestoreChecked(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, authResolved]);

  // First-time visitor default: once we've finished checking for a saved reading position
  // (guests resolve this immediately; signed-in users after the reading_progress lookup above)
  // and found none, open straight to Matthew 1 instead of the "Select a book" welcome screen.
  // Runs after the restore effect so a real saved position (which calls goToReference itself)
  // always wins — this only fires when bibleReference is still unset.
  useEffect(() => {
    if (!restoreChecked) return;
    if (bibleReference) return;
    goToReference("Matthew 1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreChecked]);

  // Gates BiblePanel's cold-start welcome screen (see the `initializing` prop passed to it below)
  // until we actually know whether there's a saved reading position to jump to — otherwise a
  // returning signed-in reader briefly sees the welcome screen (with its reading-plan cards) flash
  // before the restored chapter replaces it. Resolves near-instantly for a logged-out/guest visitor
  // (no reading_progress lookup to wait on), so this doesn't add a perceptible delay for them.
  const bibleInitializing = !authResolved || (!!session && !restoreChecked);

  // Mobile only: switches to the Articles tab (where the open article renders, in place of the
  // browse list), first remembering whichever tab was active so the article's Back button can return
  // there — but only if we're not already ON Articles (a cross-link tap from inside one article to
  // another, or a tap on a row in the browse list, must not overwrite the original "came from" tab).
  const enterMobileArticle = () => {
    // "Already reading an article" is the one case that must NOT re-record the origin — otherwise a
    // cross-link from one article to the next would rewrite "came from the map" as "came from
    // Articles". Being on the Articles tab isn't enough on its own to mean that: with no selection
    // the reader is on the browse list, which is a legitimate origin to come back to.
    // Both reads go through live refs, not the render-scoped values — see mobilePanelOf.
    const from = mobilePanelOf(panelsRef.current);
    const showingArticle = from === "articles" && hasSelectionRef.current;
    if (!showingArticle) setDetailsReturnPanel(from);
    setMobileActivePanel("articles");
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    setLocationsVisible(true);
    if (isMobile) {
      enterMobileArticle();
    } else {
      openPanel("articles");
      openPanel("map");
    }
  };

  const handleSelectPoi = (id: string) => {
    setSelectedPoiId(id);
    setSelectedId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    if (isMobile) {
      enterMobileArticle();
    } else {
      openPanel("articles");
      openPanel("map");
    }
  };

  // People don't have a map presence — selecting one (from Bible text, search, or a cross-link in
  // another detail panel) just opens the Details panel, without touching the map at all.
  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    if (isMobile) enterMobileArticle();
    else openPanel("articles");
  };

  // Topics (practices, doctrines, people groups) have no map presence, same as people — selecting one
  // just opens the Details panel.
  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTimelineEventId(null);
    if (isMobile) enterMobileArticle();
    else openPanel("articles");
  };

  // Timeline events have no map presence either — same pattern as people and topics: selecting one
  // just opens the Details panel.
  const handleSelectTimelineEvent = (id: string) => {
    setSelectedTimelineEventId(id);
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    if (isMobile) enterMobileArticle();
    else openPanel("articles");
  };

  // Shows a location on the map without opening the Details panel — used for the Bible text's
  // location links and the map search bar, where the reader wants to see *where* a place is first;
  // clicking the pin itself (handleSelectFromMap) is what opens the full write-up.
  const focusLocationOnMap = (id: string) => {
    setDetailsHistory([]);
    setSelectedId(id);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    setLocationsVisible(true);
    if (isMobile) setMobileActivePanel("map");
    else openPanel("map");
  };

  const handleSelectPoiFromBible = (id: string) => {
    setDetailsHistory([]);
    setSelectedPoiId(id);
    setSelectedId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    if (isMobile) setMobileActivePanel("map");
    else openPanel("map");
  };

  // A reading-plan day's map focus happens silently behind the passage: on mobile the Bible tab
  // must stay active (the tap's primary intent is reading the day's passage — switching to the map
  // buried it behind a manual tab tap), while desktop keeps opening the map panel alongside the text.
  const focusPlanDayLocation = (id: string) => {
    focusLocationOnMap(id);
    if (isMobile) setMobileActivePanel("bible");
  };
  const focusPlanDayPoi = (id: string) => {
    handleSelectPoiFromBible(id);
    if (isMobile) setMobileActivePanel("bible");
  };

  // A person link inside the Bible text does jump to the Details panel (people have no map presence
  // to show instead) — still a fresh starting point, so it clears the back trail like the two above.
  // `preserveHistory` is set when this is reached via a Timeline cross-link (a Lifespans-bar click, or
  // a person link inside the in-mode TimelineEventPanel article overlay) — exitTimelineThen has
  // already pushed the timeline view being left onto detailsHistory, and unconditionally clearing it
  // here would wipe that entry before "Back" ever gets a chance to use it.
  const handleSelectPersonFromBible = (id: string, opts?: { preserveHistory?: boolean }) => {
    if (!opts?.preserveHistory) setDetailsHistory([]);
    handleSelectPerson(id);
  };

  // A topic link inside the Bible text — same pattern as person: no map presence, fresh starting
  // point, except when arriving via a Timeline cross-link (see handleSelectPersonFromBible above).
  const handleSelectTopicFromBible = (id: string, opts?: { preserveHistory?: boolean }) => {
    if (!opts?.preserveHistory) setDetailsHistory([]);
    handleSelectTopic(id);
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

  // Picking a result in the standalone Articles browse/search panel is the same kind of fresh
  // starting point as a map pin or search result — clear the back trail, then reuse the exact same
  // per-type selection handlers everything else in the app opens a details article through (Bible
  // text links, map pins, cross-links inside another article). Location/POI already have a
  // ready-made "fresh start" wrapper above; person/topic reuse the "FromBible" ones (which clear
  // history by default too); timeline events get the one new wrapper below, following that same
  // naming pattern.
  const handleSelectTimelineEventFromArticles = (id: string) => {
    setDetailsHistory([]);
    handleSelectTimelineEvent(id);
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
  const handleSelectTopicFromDetails = (id: string) => {
    if (currentDetailsSelection) setDetailsHistory((h) => [...h, currentDetailsSelection]);
    handleSelectTopic(id);
  };
  const handleSelectTimelineEventFromDetails = (id: string) => {
    if (currentDetailsSelection) setDetailsHistory((h) => [...h, currentDetailsSelection]);
    handleSelectTimelineEvent(id);
  };

  // --- Timeline mode -----------------------------------------------------------------------------
  // Full-screen zoomable timeline (TimelineView) rendered over the normal map/bible/panels layout.
  // Entered from the desktop footer strip, the mobile Timeline tab, or a link-choice popup's "View
  // in Timeline"; left via the view's Back button (or, on mobile, by picking another tab).
  const [showTimeline, setShowTimeline] = useState(false);
  // The live pan/zoom view inside Timeline mode, lifted up here so it survives Timeline unmounting —
  // TimelineView reports every change via onViewChange, and reads it back via initialView so
  // reopening (however it's reached) resumes the last view instead of resetting to the cold-start
  // default. Also what gets snapshotted into a `{ kind: "timeline" }` detailsHistory entry (see
  // exitTimelineThen/goBackInDetails below) so a cross-link away from Timeline can restore this exact
  // view later via "Back", rather than wherever Timeline happens to be when it's reopened.
  const [savedTimelineView, setSavedTimelineView] = useState<TimelineViewState | null>(null);
  // When Timeline mode was opened for a specific entity (link-choice popup), the view opens zoomed
  // to that entity's events/lifespan with a brief highlight. Null for plain entries.
  const [timelineFocusEntityId, setTimelineFocusEntityId] = useState<string | null>(null);
  // Event selected *inside* Timeline mode — its TimelineEventPanel slides in as an overlay on top
  // of the timeline (not the normal Details panel, which sits underneath the mode).
  const [timelineOverlayEventId, setTimelineOverlayEventId] = useState<string | null>(null);
  const timelineOverlayEvent = timelineEvents.find((e) => e.id === timelineOverlayEventId) ?? null;

  /** Picking a result from the header's Timeline search (see TimelineSearchBar/searchMode below) —
   * stays inside Timeline mode (unlike the cross-links inside the article overlay, which exit it),
   * both flying the view to the event's own year range (via focusEntityId — TimelineView's focus
   * matcher accepts an event's own id, not just a person/place id) and opening its article overlay,
   * mirroring how a Map search result focuses the map and a Bible search result jumps to the passage. */
  const handleSelectTimelineSearchResult = (id: string) => {
    setTimelineFocusEntityId(id);
    setTimelineOverlayEventId(id);
  };

  const openTimeline = () => {
    // Timeline and Games are both full-area takeovers at the same z-index (see .timeline-mode/
    // .game-mode in App.css) — leaving one mounted while opening the other means it silently paints
    // underneath, so its own entry point looks unresponsive. Always close the others first.
    closeGame();
    closeMyProfile();
    track("panel.open", { panel: "timeline" });
    setTimelineFocusEntityId(null);
    setTimelineOverlayEventId(null);
    setShowTimeline(true);
  };
  const closeTimeline = () => {
    setShowTimeline(false);
    setTimelineOverlayEventId(null);
    setTimelineFocusEntityId(null);
  };
  // showTimeline mirrored in a ref so the stable link-choice handlers below always see the live
  // value without needing to be recreated per render.
  const showTimelineRef = useRef(showTimeline);
  showTimelineRef.current = showTimeline;

  /** Handlers for the link-choice popup (VerseText/LinkedVerseText via TimelineLinkContext) — only
   * consulted when a clicked name has a timeline association; every other click never reaches these. */
  const timelineLinkHandlers: TimelineLinkHandlers = {
    onSelectTimelineEvent: (id: string) => {
      if (showTimelineRef.current) {
        // Already inside Timeline mode — show the article as the in-mode overlay instead of
        // silently changing the details panel hidden underneath.
        setTimelineOverlayEventId(id);
        return;
      }
      setDetailsHistory([]);
      handleSelectTimelineEvent(id);
    },
    onOpenTimelineForEntity: (entityId: string) => {
      setTimelineFocusEntityId(entityId);
      setTimelineOverlayEventId(null);
      setShowTimeline(true);
    },
  };

  /** Leave Timeline mode and run a normal navigation — used by every cross-link reachable while
   * Timeline mode is open (the Lifespans bar, the Books band, and every cross-link inside the
   * in-mode TimelineEventPanel article overlay), so following a person/place/book link lands the
   * reader back in the regular app on that entity's page. Before closing, it snapshots the exact
   * pan/zoom view being left onto detailsHistory as a `{ kind: "timeline" }` entry (skipped if
   * there's no view yet to snapshot — practically never, since the cold-start/default view lands
   * within one render of mount) — see goBackInDetails for the other half of this round trip. */
  const exitTimelineThen = (navigate: () => void) => {
    if (savedTimelineView) {
      setDetailsHistory((h) => [...h, { kind: "timeline", view: savedTimelineView }]);
    }
    closeTimeline();
    navigate();
  };

  // A details article's Back button: steps back through the cross-link trail if there is one (e.g.
  // Jesus's bio -> Nazareth -> Back returns to Jesus), and once that trail is empty, leaves Details
  // entirely — back to whichever map/Bible/tab view the reader actually opened it from (see
  // closeDetailsPanel) — rather than becoming a dead end with nothing left to do.
  const goBackInDetails = () => {
    if (detailsHistory.length === 0) {
      closeDetailsPanel();
      return;
    }
    const prev = detailsHistory[detailsHistory.length - 1];
    setDetailsHistory((h) => h.slice(0, -1));
    if (prev.kind === "location") handleSelect(prev.id);
    else if (prev.kind === "poi") handleSelectPoi(prev.id);
    else if (prev.kind === "topic") handleSelectTopic(prev.id);
    else if (prev.kind === "timelineEvent") handleSelectTimelineEvent(prev.id);
    else if (prev.kind === "timeline") {
      // Restore Timeline mode at the exact view it was left at, rather than wherever openTimeline()
      // would otherwise land (the resumed/cold-start default) or the full-dataset Fit view.
      setSavedTimelineView(prev.view);
      openTimeline();
    } else handleSelectPerson(prev.id);
  };

  const hasSelection =
    selectedId !== null ||
    selectedPoiId !== null ||
    selectedPersonId !== null ||
    selectedTopicId !== null ||
    selectedTimelineEventId !== null;
  // Live mirror for the same stale-closure reason as panelsRef (see mobilePanelOf).
  const hasSelectionRef = useRef(hasSelection);
  hasSelectionRef.current = hasSelection;
  // Clears the pin-selection filter so every pin reappears — deliberately leaves the camera where
  // it is (MapView's selectedId/selectedPoiId effect rebuilds the pin set; nothing refits/flies).
  const clearSelection = () => {
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    setDetailsHistory([]);
    if (isMobile) setMobileActivePanel("map");
    // Desktop: the Articles panel stays open and simply falls back to its browse/search list now
    // that nothing is selected — it's a destination the reader opened, not a sidecar of the map, so
    // "Show All Pins" shouldn't close it out from under them.
  };

  // Every article's own Back button, once its cross-link trail is exhausted. Clearing the selection
  // is all desktop needs: the Articles panel is a single slot whose two states are "an article" and
  // "the browse/search list", so dropping the selection reveals the list again in place — the
  // browse-list state is deliberately the back stop, not a closed panel.
  //
  // Mobile keeps the extra step of returning to whichever tab the reader actually came from
  // (detailsReturnPanel — the tab active right before a pin/link tap jumped them to Articles), since
  // there only one panel is on screen at a time and stranding them on the Articles list would lose
  // the map or passage they were looking at. Arriving from the browse list itself leaves
  // detailsReturnPanel untouched (see enterMobileArticle), so that case lands back on the list.
  const closeDetailsPanel = () => {
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    setDetailsHistory([]);
    if (isMobile) setMobileActivePanel(detailsReturnPanel);
  };

  const openVerse = (reference: string) => {
    goToReference(reference);
    if (isMobile) {
      setMobileActivePanel("bible");
    } else {
      openPanel("bible");
    }
  };

  // A details-panel reflection prompt's "Journal this": jump the reader to the prompt's primary
  // reference (the normal openVerse path) and hand BiblePanel a one-shot request to open the note
  // composer prefilled with the prompt once that chapter lands. Nonce for the same reason as
  // referenceNonce above — journaling the same prompt twice must still re-open the composer.
  const [journalRequest, setJournalRequest] = useState<{ reference: string; prompt: string; nonce: number } | null>(
    null
  );
  const handleJournalPrompt = (reference: string, prompt: string) => {
    setJournalRequest((prev) => ({ reference, prompt, nonce: (prev?.nonce ?? 0) + 1 }));
    openVerse(reference);
  };

  // --- Seasonal walks (Holy Week, Advent) ------------------------------------------------------
  // A dismissible banner pill under the header — deliberately a banner, not a modal — shown only
  // while today falls in a walk's season window. Computed once per app load; dismissal persists per
  // season occurrence (see getWalkDismissKey), so one × keeps it gone until that season next year.
  const [activeWalk] = useState(() => getActiveSeasonalWalk());
  const [walkBannerDismissed, setWalkBannerDismissed] = useState(() =>
    activeWalk ? localStorage.getItem(getWalkDismissKey(activeWalk)) === "1" : true
  );
  const dismissWalkBanner = () => {
    if (activeWalk) localStorage.setItem(getWalkDismissKey(activeWalk), "1");
    setWalkBannerDismissed(true);
  };
  const [walkOpen, setWalkOpen] = useState(false);
  const [walkStopIndex, setWalkStopIndex] = useState(0);
  /** Focuses a stop on the map (locations and POIs live in separate datasets, so resolve against
   * locations first — none of the walk stops use an id that exists in both) and loads its passage
   * into the Bible panel without stealing the mobile tab away from the map. */
  const goToWalkStop = (index: number) => {
    if (!activeWalk) return;
    const stop = activeWalk.stops[index];
    if (!stop) return;
    setWalkStopIndex(index);
    if (locations.some((l) => l.id === stop.locationId)) focusLocationOnMap(stop.locationId);
    else if (pois.some((p) => p.id === stop.locationId)) handleSelectPoiFromBible(stop.locationId);
    goToReference(formatWalkStopReference(stop));
  };
  const openWalk = () => {
    setWalkOpen(true);
    goToWalkStop(0);
  };
  const closeWalk = () => setWalkOpen(false);
  // [lng, lat] waypoints for the active walk's route line, in stop order — memoized so MapView's
  // route effect (keyed on this array's identity) doesn't redraw/refit on every App render. Null
  // whenever the walk view is closed, which empties the map's route source.
  const walkRouteCoordinates = useMemo<[number, number][] | null>(() => {
    if (!walkOpen || !activeWalk) return null;
    const coords: [number, number][] = [];
    activeWalk.stops.forEach((stop) => {
      const target =
        locations.find((l) => l.id === stop.locationId) ?? pois.find((p) => p.id === stop.locationId);
      if (target) coords.push(target.coordinates);
    });
    return coords;
  }, [walkOpen, activeWalk]);

  // The Articles panel is one slot with two states: an open article when something is selected, the
  // browse/search list otherwise. Opening an article therefore costs no extra panel slot — it
  // replaces the list inside the slot the reader already has — which is why a map-pin tap can no
  // longer evict the Bible panel just to show a write-up.
  const showArticle = panels.articles && hasSelection;
  const noPanelsOpen = !panels.bible && !panels.map && !panels.notes && !panels.friends && !panels.articles;
  const toggleMenuPanel = (key: PanelKey) => (panels[key] ? closePanel(key) : openPanel(key));
  const sideExpand = !panels.map;
  const activeMobilePanel: PanelKey = mobilePanelOf(panels);

  // Which tabs the reader has chosen to keep in the bottom bar (Settings → Tab Bar; see
  // lib/mobileTabs.tsx). App needs it for one reason only: rescuing someone who hides the tab they
  // are standing on.
  const { visible: visibleTabs } = useMobileTabs();
  // Which destination is on screen right now, in the same precedence the tab bar's own active
  // styling uses: the full-screen takeovers win over whatever panel is mounted underneath them.
  // Also what the header hamburger (MobileNavMenu) marks as the current row.
  const currentMobileTab: MobileTabKey = showTimeline
    ? "timeline"
    : showGame
      ? "games"
      : showMyProfile || activeMobilePanel === "friends"
        ? "social"
        : activeMobilePanel === "articles"
          ? "articles"
          : activeMobilePanel;
  useEffect(() => {
    if (!isMobile) return;
    if (visibleTabs[currentMobileTab] !== false) return;
    // The tab under the reader just disappeared. Leave every takeover and land on Bible — the one
    // tab that can never be hidden, so this is always a real destination and never a blank panel.
    closeTimeline();
    closeGame();
    closeMyProfile();
    setMobileActivePanel("bible");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs, isMobile]);

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
  const articlesMounted = panels.articles || isMobile;
  const articlesHiddenOnMobile = isMobile && !panels.articles;
  // Which panel the header search bar serves — each panel gets its own search behavior (Map flies to
  // a location, Bible runs a word/phrase search, Notes filters live, Timeline searches timeline
  // events) rather than one generic bar, so only one can be "active" at a time. On desktop, when
  // Bible+Map are both open at once the choice is genuinely ambiguous, so it's resolved by the
  // explicit `searchScope` toggle (rendered next to the search box only in that situation) instead
  // of silently picking one — see the scope-toggle UI below.
  //
  // Timeline mode is checked FIRST, ahead of the panel/mobile-tab logic below: `showTimeline` is a
  // separate top-level takeover, not one of the PanelKey values those branches switch on, and the
  // panels underneath stay mounted (with their own panels.bible/panels.map truthy) the whole time
  // Timeline is open. Without this early case, opening Timeline while Bible (or Map) was last active
  // fell through to that stale panel state and kept showing Bible's/Map's search bar and behavior on
  // top of Timeline — the bug this early-out fixes.
  //
  // Games mode is checked even earlier, and resolves to null: like Timeline it's a full-area takeover
  // that leaves the panels underneath mounted, but unlike Timeline it has nothing for the header
  // search to act on — so without this early-out it fell through to whatever panel was last active
  // and painted Bible's (or Map's/Notes') search bar over the Games UI. Games gets no header search.
  //
  // My Profile is the third takeover of that same shape, and it leaked the same way — a profile page
  // with "Search Scripture…" sitting on top of it. It resolves to "people" rather than null because
  // a profile page DOES have something for a header search to act on: other people. It's ordered
  // between Games and Timeline to match the render order of the three takeovers below (all z-index
  // 60, so the last one rendered is the one on screen): Games over My Profile over Timeline.
  // The guard mirrors the render condition — for a guest the takeover isn't rendered at all, so the
  // panel underneath is what's actually on screen and should keep its own search.
  const myProfileMode = showMyProfile && !!session && !session.user.is_anonymous;
  // The whole app requires a real account (owner's decision — see AuthGate.tsx). Gate on:
  //   - auth not resolved yet, or a `?code=` recovery link still being exchanged: render nothing
  //     rather than flashing the gate on top of what turns out to be a mid-recovery visitor.
  //   - no session, or a session that's merely anonymous (the retired "Continue as Guest" path,
  //     still live in the database for existing sessions we were told not to delete): show the gate.
  // A password-recovery session is never anonymous, so it never trips this — ResetPasswordGate
  // below handles it on its own.
  const showAuthGate = authResolved && !exchangingRecoveryCode && (!session || session.user.is_anonymous);
  const searchMode: "map" | "bible" | "notes" | "timeline" | "people" | null = showGame
    ? null
    : myProfileMode
    ? "people"
    : showTimeline
    ? "timeline"
    : isMobile
      ? activeMobilePanel === "map" || activeMobilePanel === "bible" || activeMobilePanel === "notes"
        ? activeMobilePanel
        : null
      : panels.map && panels.bible
        ? (searchScope === "places" ? "map" : "bible")
        : panels.map
          ? "map"
          : panels.bible
            ? "bible"
            : panels.notes
              ? "notes"
              : null;

  // Mobile shows exactly one panel at a time via the bottom tab bar, so there's no ambiguity to
  // surface a toggle for there — instead, keep `searchScope` auto-aligned with whichever tab is
  // active so it never silently disagrees with what's on screen (e.g. re-opening the app to the
  // Map tab, or switching to it, should make Places the active scope, not leave Scripture stuck
  // from a fresh load). Desktop never runs this, so `searchScope`'s initial "scripture" default —
  // and any manual choice made once both panels are open — is left alone.
  useEffect(() => {
    if (!isMobile) return;
    if (activeMobilePanel === "bible") setSearchScope("scripture");
    else if (activeMobilePanel === "map") setSearchScope("places");
  }, [isMobile, activeMobilePanel]);

  const goHome = () => {
    if (isMobile) setMobileActivePanel("bible");
    else openPanel("bible");
  };

  /** Where the header hamburger routes to. Every branch mirrors the handler the bottom tab bar
   * already hands MobileTabBar for that same destination, so the two agree.
   * Timeline and Games are full-screen takeovers rather than panels, and
   * Social opens My Profile — those three don't touch setMobileActivePanel at all. Every branch
   * first leaves whichever takeover is currently up, since all three sit at the same z-index and
   * would otherwise stay painted over the destination. */
  /** The two full-area takeovers both platforms can navigate to. Shared by the mobile router below
   * and by desktop's PanelMenu "Go to" group, which replaced the old footer strip: the routing is
   * identical on both (leave whichever other takeover is up, then open this one), even though the
   * rest of `goToMobileDestination` is mobile-specific — Social/panel tabs have no desktop analogue.
   * Kept as one function so the two entry points can't drift apart. */
  const goToTakeover = (key: "timeline" | "games") => {
    if (key === "timeline") {
      closeGame();
      closeMyProfile();
      openTimeline();
    } else {
      closeTimeline();
      closeMyProfile();
      openGame();
    }
  };

  /** Desktop's way back out of a takeover from the menu — picking the destination that is already
   * on screen. Mirrors what the old footer strip's active button did. */
  const leaveTakeover = () => {
    closeTimeline();
    closeGame();
  };

  const goToMobileDestination = (key: MobileTabKey) => {
    if (key === "timeline" || key === "games") {
      goToTakeover(key);
      return;
    }
    if (key === "social") {
      closeTimeline();
      closeGame();
      // Same nonce the tab bar's Social tab bumps — it pops the account flyout, which is the mobile
      // route into My Profile. Guarded on isMobile for the same reason it is there.
      if (isMobile) setOpenProfileNonce((n) => (n ?? 0) + 1);
      return;
    }
    closeTimeline();
    closeGame();
    closeMyProfile();
    setMobileActivePanel(key);
  };

  /** Where the reader is standing, in the terms the issue reporter files a report in: a synthetic
   * route, a human page title, and — the field that decides whether a report is actionable — WHICH
   * article, person, chapter, profile or screen it is about.
   *
   * Derived here and nowhere else, because this component is the only thing that can. The app has
   * no router, so `window.location` is the same string on every screen and there is nothing to
   * read; the answer instead lives across three full-screen takeovers, the seasonal walk, the
   * `panels` record, the mobile tab, and five separate detail selections. `route` is synthetic for
   * that reason — without it the `route` column would say "/" for every report ever filed.
   *
   * Precedence deliberately mirrors `searchMode` above, for the same reason it has one: the
   * takeovers stay mounted OVER panels that are still open underneath, so a naive read of `panels`
   * reports the Bible panel while the reader is looking at Games. Within the panels it follows
   * `currentDetailsSelection`'s own person > POI > topic > timeline event > place order.
   *
   * The target is a best guess, and the form treats it as one — it renders as a chip with a "Not
   * this" control. On desktop three panels can be open at once and no derivation can know which one
   * the reader means; asking is better than being confidently wrong. */
  const reportSurface = useMemo<ReportSurface>(() => {
    const detailTarget = (): ReportTarget | null => {
      if (selectedPerson) return { kind: "person", id: selectedPerson.id, label: selectedPerson.name };
      if (selectedPoi) return { kind: "poi", id: selectedPoi.id, label: selectedPoi.name };
      if (selectedTopic) return { kind: "topic", id: selectedTopic.id, label: selectedTopic.name };
      if (selectedTimelineEvent)
        return { kind: "timeline_event", id: selectedTimelineEvent.id, label: selectedTimelineEvent.title };
      // A place is `article` — sql/025 gave POIs, people, topics and events kinds of their own,
      // which leaves that kind for the fifth thing the Articles panel browses. See
      // TARGET_KIND_LABELS in lib/reportsApi.ts, which labels it "Place" for readers.
      if (selectedLocation) return { kind: "article", id: selectedLocation.id, label: selectedLocation.name };
      return null;
    };

    if (showGame) return { route: "games", title: "Games", target: null };

    if (myProfileMode) {
      return viewedPersonId
        ? {
            route: `profile/${viewedPersonId}`,
            title: "Someone else's profile",
            target: { kind: "profile", id: viewedPersonId, label: "Another member's profile" },
          }
        : {
            route: "profile",
            title: "My Profile",
            target: { kind: "profile", id: "self", label: "My own profile" },
          };
    }

    if (showTimeline) {
      const overlay = timelineOverlayEventId
        ? timelineEvents.find((e) => e.id === timelineOverlayEventId) ?? null
        : null;
      return overlay
        ? {
            route: `timeline/${overlay.id}`,
            title: `Timeline — ${overlay.title}`,
            target: { kind: "timeline_event", id: overlay.id, label: overlay.title },
          }
        : { route: "timeline", title: "Timeline", target: null };
    }

    if (walkOpen && activeWalk) {
      return { route: `walk/${activeWalk.id}`, title: `${activeWalk.title} (seasonal walk)`, target: null };
    }

    if (showArticle) {
      const target = detailTarget();
      return target
        ? { route: `articles/${target.kind}/${target.id}`, title: `${target.label} — article`, target }
        : { route: "articles", title: "Articles", target: null };
    }

    // No takeover and no open article: name whichever panel the reader is actually looking at.
    // Mobile shows exactly one; desktop shows up to three, so this picks the most-likely subject
    // rather than pretending to know — the form's "Not this" control is the escape hatch.
    const active: PanelKey = isMobile
      ? activeMobilePanel
      : panels.articles
        ? "articles"
        : panels.bible
          ? "bible"
          : panels.map
            ? "map"
            : panels.notes
              ? "notes"
              : panels.friends
                ? "friends"
                : "bible";

    switch (active) {
      // No target here on purpose: the chapter on screen lives inside BiblePanel's own state, and
      // captureReportContext() fills it in from what that panel publishes. See lib/reportContext.ts.
      case "bible":
        return { route: "bible", title: "Bible reader", target: null };
      case "map":
        return { route: "map", title: "Map", target: detailTarget() };
      case "notes":
        return { route: "notes", title: "My Notes", target: null };
      case "friends":
        return { route: "social", title: "Social — friends, groups and messages", target: null };
      case "articles":
        return { route: "articles", title: "Articles", target: null };
    }
  }, [
    showGame,
    myProfileMode,
    viewedPersonId,
    showTimeline,
    timelineOverlayEventId,
    walkOpen,
    activeWalk,
    showArticle,
    isMobile,
    activeMobilePanel,
    panels,
    selectedPerson,
    selectedPoi,
    selectedTopic,
    selectedTimelineEvent,
    selectedLocation,
  ]);

  // Remembers the reader's last text selection for the report form. It has to be remembered rather
  // than read on demand: reaching the form means clicking the account menu, and that click collapses
  // whatever was selected, so window.getSelection() is always empty by the time the form mounts.
  useEffect(() => installSelectionCapture(), []);
  // Text highlighted in an article is not context for a report about the Games screen. Dropping it
  // on every navigation is the cheap half of the staleness guard; lib/reportContext.ts has a TTL for
  // the other half (sitting on one screen for a long time).
  useEffect(() => {
    clearRememberedSelection();
  }, [reportSurface.route]);

  // Below this point is the entire rest of the app — header, every panel, both takeovers, the tab
  // bar. Sign-up/sign-in is required site-wide (owner's decision), so a visitor with no real account
  // sees AuthGate and literally nothing else: no panel, toast or takeover from the rest of this
  // component mounts underneath it. While auth genuinely hasn't resolved yet (first paint, or a
  // `?code=` recovery link mid-exchange — see exchangingRecoveryCode above) this renders nothing at
  // all rather than flashing the gate first.
  if (showAuthGate) return <AuthGate />;
  if (!authResolved || exchangingRecoveryCode) return null;

  return (
    <TimelineLinkContext.Provider value={timelineLinkHandlers}>
    <div className="app-shell">
      <NotificationToasts session={session} onOpenFriends={openFriendsFromProfile} />
      {passwordRecovery && session && <ResetPasswordGate onDone={() => setPasswordRecovery(false)} />}
      {!passwordRecovery && needsDisplayName && session && (
        <DisplayNameGate userId={session.user.id} onSaved={() => setNeedsDisplayName(false)} />
      )}
      <header className="app-header">
        {/* Mobile-only, at the far left of the header (matching the desktop order: hamburger, logo,
            wordmark). It is the escape hatch for destinations the reader has hidden from the
            customisable bottom bar — see MobileNavMenu. Desktop keeps PanelMenu below; the two are
            never on screen together. */}
        {isMobile && <MobileNavMenu current={currentMobileTab} onNavigate={goToMobileDestination} />}
        <PanelMenu
          panels={panels}
          onToggle={toggleMenuPanel}
          lastAutoClosed={lastAutoClosed}
          friendsBadgeCount={pendingFriendRequests + unreadMessages + groupsBadgeCount}
          activeDestination={showTimeline ? "timeline" : showGame ? "games" : null}
          onNavigate={goToTakeover}
          onLeaveDestination={leaveTakeover}
        />
        <button type="button" className="app-logo-button" onClick={goHome} aria-label="Go to Bible">
          <img src="/favicon.svg" className="app-logo" alt="" aria-hidden="true" />
        </button>
        {/* Wordmark and slogan are one locked unit, exactly as on the brand's cover art: the
            slogan is a subtitle of the name, not an independent line of header content. Hidden
            wholesale on mobile (see .app-brand in the max-width:768px block) — the mobile header
            already drops the wordmark for space, and a slogan with no name to sit under is just
            clutter in a bar that's fighting for room. */}
        <div className="app-brand">
          <h1>Capstone Bible</h1>
          <p className="brand-tagline">God&rsquo;s Word. Every day.</p>
        </div>
        {(searchMode === "map" || searchMode === "bible") && (
          <div className="header-search-group">
            {searchMode === "map" && (
              <SearchBar
                locations={locations}
                onSelect={(id) => {
                  track("search.run", { scope: "places" });
                  focusLocationOnMap(id);
                }}
                selectedLocationName={selectedLocation?.name ?? null}
              />
            )}
            {searchMode === "bible" && (
              <HeaderTextSearch
                placeholder="Search Scripture…"
                icon="bible"
                value={bibleSearchQuery}
                onChange={setBibleSearchQuery}
                completion={bibleCompletion}
                // Accepting writes the whole reference into the box and submits it in the same
                // commit. BiblePanel's effect keys off the nonce and reads the query from that same
                // render, so it sees "Matthew 1" and not the "Matt" that was there a moment ago.
                onAcceptCompletion={
                  bibleCompletion
                    ? () => {
                        setBibleSearchQuery(bibleSuggestion!.text);
                        track("search.run", { scope: "scripture" });
                        setBibleSearchNonce((n) => n + 1);
                      }
                    : undefined
                }
                onSubmit={() => {
                  // The scope, never the query. What someone searches Scripture for is
                  // exactly the kind of thing this app has no business logging.
                  track("search.run", { scope: "scripture" });
                  setBibleSearchNonce((n) => n + 1);
                }}
              />
            )}
            {/* Only genuinely ambiguous when both panels are open at once (desktop) — that's the
                only time the explicit scope toggle is worth the header space. Otherwise the active
                panel already makes the scope obvious, exactly as before this toggle existed. Placed
                after the search bar (rather than before it) so it reads as "search bar, then its
                scope" left to right. */}
            {panels.map && panels.bible && (
              <div className="search-scope-toggle" role="group" aria-label="Search scope">
                <button
                  type="button"
                  className={searchScope === "scripture" ? "active" : ""}
                  aria-pressed={searchScope === "scripture"}
                  title="Search Scripture"
                  aria-label="Search Scripture"
                  onClick={() => setSearchScope("scripture")}
                >
                  <Icon name="bible" />
                </button>
                <button
                  type="button"
                  className={searchScope === "places" ? "active" : ""}
                  aria-pressed={searchScope === "places"}
                  title="Search Places"
                  aria-label="Search Places"
                  onClick={() => setSearchScope("places")}
                >
                  <Icon name="map" />
                </button>
              </div>
            )}
          </div>
        )}
        {searchMode === "notes" && (
          <HeaderTextSearch
            placeholder="Search My Notes"
            icon="notes"
            value={notesSearchQuery}
            onChange={setNotesSearchQuery}
          />
        )}
        {searchMode === "timeline" && (
          <TimelineSearchBar events={timelineEvents} onSelect={handleSelectTimelineSearchResult} />
        )}
        {searchMode === "people" && session && (
          <PeopleSearchBar viewerId={session.user.id} onSelect={setViewedPersonId} />
        )}
        <AuthButton
          session={session}
          openProfileNonce={openProfileNonce}
          onOpenReadingPlans={openReadingPlans}
          onOpenMyProfile={openMyProfile}
          profileVersion={profileVersion}
          reportSurface={reportSurface}
        />
      </header>
      {/* Seasonal walk banner — a slim pill strip under the header (not a modal; see the walk state
          block above). Hidden while the walk view itself is open to avoid saying it twice. */}
      {activeWalk && !walkBannerDismissed && !walkOpen && (
        <div className="walk-banner">
          <button type="button" className="walk-banner-pill" onClick={openWalk}>
            {activeWalk.emoji} <strong>{activeWalk.title}</strong>
            <span className="walk-banner-tagline"> — {activeWalk.tagline.toLowerCase()}</span>
          </button>
          <button
            type="button"
            className="walk-banner-dismiss"
            onClick={dismissWalkBanner}
            aria-label="Dismiss for this season"
            title="Dismiss for this season"
          >
            ×
          </button>
        </div>
      )}
      <div className="app-body">
        {bibleMounted && (
          <BiblePanel
            reference={bibleReference}
            referenceNonce={referenceNonce}
            onSelectLocation={focusLocationOnMap}
            onSelectPoi={handleSelectPoiFromBible}
            onPlanDaySelectLocation={focusPlanDayLocation}
            onPlanDaySelectPoi={focusPlanDayPoi}
            onSelectPerson={handleSelectPersonFromBible}
            onSelectTopic={handleSelectTopicFromBible}
            expand={sideExpand}
            style={{ width: bibleWidth }}
            userId={session?.user.id}
            restoreTranslation={restoreTranslation}
            hidden={bibleHiddenOnMobile}
            onNotesChanged={() => setNotesVersion((n) => n + 1)}
            externalSearchQuery={bibleSearchQuery}
            externalSearchNonce={bibleSearchNonce}
            journalRequest={journalRequest}
            openReadingPlansRequest={openReadingPlansNonce}
            openBookIntroRequest={openBookIntroRequest}
            onBookIntroBack={detailsHistory.length > 0 ? goBackInDetails : undefined}
            initializing={bibleInitializing}
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
              walkRoute={walkRouteCoordinates}
            />
            <LayerControls
              map={map}
              poisVisible={poisVisible}
              onTogglePois={() => setPoisVisible((v) => !v)}
              poiCount={pois.length}
              locationsVisible={locationsVisible}
              onToggleLocations={() => setLocationsVisible((v) => !v)}
              defaultMinimized
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
        {/* --- The Articles slot ------------------------------------------------------------------
            One position in the layout, two states. ArticlesPanel (the browse/search list) stays
            mounted underneath the whole time and is merely hidden while an article is open, so the
            reader's search text and expanded sections are still there when they come back — which is
            the whole point of Back landing on the list rather than on a closed panel.
            Exactly one of the five article panels renders, in the same precedence order as
            currentDetailsSelection (person > POI > topic > timeline event > location). */}
        {panels.map && panels.articles && (
          <ResizeHandle
            width={articlesWidth}
            minWidth={MIN_PANEL_WIDTH}
            maxWidth={MAX_PANEL_WIDTH}
            direction={-1}
            onWidthChange={setArticlesWidth}
          />
        )}
        {showArticle && selectedPerson && (
          <PersonPanel
            person={selectedPerson}
            onBack={goBackInDetails}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onJournalPrompt={session ? handleJournalPrompt : undefined}
            expand={sideExpand}
            style={{ width: articlesWidth }}
          />
        )}
        {showArticle && !selectedPerson && selectedPoi && (
          <PoiPanel
            poi={selectedPoi}
            onBack={goBackInDetails}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onSelectVerse={openVerse}
            expand={sideExpand}
            style={{ width: articlesWidth }}
          />
        )}
        {showArticle && !selectedPerson && !selectedPoi && selectedTopic && (
          <TopicPanel
            topic={selectedTopic}
            onBack={goBackInDetails}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onJournalPrompt={session ? handleJournalPrompt : undefined}
            expand={sideExpand}
            style={{ width: articlesWidth }}
          />
        )}
        {showArticle && !selectedPerson && !selectedPoi && !selectedTopic && selectedTimelineEvent && (
          <TimelineEventPanel
            event={selectedTimelineEvent}
            onBack={goBackInDetails}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onSelectTimelineEvent={handleSelectTimelineEventFromDetails}
            expand={sideExpand}
            style={{ width: articlesWidth }}
          />
        )}
        {showArticle && !selectedPerson && !selectedPoi && !selectedTopic && !selectedTimelineEvent && (
          <LocationPanel
            location={selectedLocation}
            onBack={goBackInDetails}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onJournalPrompt={session ? handleJournalPrompt : undefined}
            expand={sideExpand}
            style={{ width: articlesWidth }}
          />
        )}
        {articlesMounted && (
          <ArticlesPanel
            locations={locations}
            pois={pois}
            people={people}
            topics={topics}
            timelineEvents={timelineEvents}
            onSelectLocation={handleSelectFromMap}
            onSelectPoi={handleSelectPoiFromMap}
            onSelectPerson={handleSelectPersonFromBible}
            onSelectTopic={handleSelectTopicFromBible}
            onSelectTimelineEvent={handleSelectTimelineEventFromArticles}
            expand={sideExpand}
            style={{ width: articlesWidth }}
            hidden={articlesHiddenOnMobile || showArticle}
          />
        )}
        {noPanelsOpen && (
          <div className="all-closed-message">
            Everything's closed — reopen a panel from the ☰ menu.
          </div>
        )}
        {/* Timeline mode — covers the whole map/bible/panels area (the layout stays mounted
            underneath so map/Bible state survives the visit). The header, desktop footer, and
            mobile tab bar remain, so the entry point that opened it also closes it. */}
        {showTimeline && (
          <div className="timeline-mode">
            <TimelineView
              onClose={closeTimeline}
              onSelectTimelineEvent={setTimelineOverlayEventId}
              onSelectPerson={(id) =>
                exitTimelineThen(() => handleSelectPersonFromBible(id, { preserveHistory: true }))
              }
              onSelectBook={(book) =>
                exitTimelineThen(() => {
                  if (isMobile) setMobileActivePanel("bible");
                  setOpenBookIntroRequest((r) => ({ book, nonce: (r?.nonce ?? 0) + 1 }));
                })
              }
              focusEntityId={timelineFocusEntityId ?? undefined}
              initialView={savedTimelineView}
              onViewChange={setSavedTimelineView}
            />
            {/* Selecting an event opens its article as a slide-in overlay on top of the timeline —
                same panel component the Details column uses, so it feels native. Back returns to
                the timeline (Timeline itself never unmounts for this case, so its pan/zoom view is
                untouched underneath); any cross-link inside the article exits the mode into the
                normal app, first snapshotting the live view via exitTimelineThen so "Back" from
                wherever the cross-link lands can restore this exact timeline view later. */}
            {timelineOverlayEvent && (
              <div className="timeline-event-overlay">
                <TimelineEventPanel
                  event={timelineOverlayEvent}
                  onBack={() => setTimelineOverlayEventId(null)}
                  onSelectVerse={(ref) => exitTimelineThen(() => openVerse(ref))}
                  onSelectLocation={(id) => exitTimelineThen(() => handleSelect(id))}
                  onSelectPoi={(id) => exitTimelineThen(() => handleSelectPoi(id))}
                  onSelectPerson={(id) =>
                    exitTimelineThen(() => handleSelectPersonFromBible(id, { preserveHistory: true }))
                  }
                  onSelectTopic={(id) =>
                    exitTimelineThen(() => handleSelectTopicFromBible(id, { preserveHistory: true }))
                  }
                  onSelectTimelineEvent={setTimelineOverlayEventId}
                  expand
                />
              </div>
            )}
          </div>
        )}
        {/* My Profile mode — same full-area takeover as Timeline mode above (the layout underneath
            stays mounted so map/Bible state survives the visit). Only meaningful for a real account;
            guests are routed to the account menu's Settings view instead (see AuthButton). */}
        {myProfileMode && session && (
          <div className="myprofile-mode">
            {viewedPersonId ? (
              /* Someone found through the header's people search — the same read-only profile the
                 Friends list opens, shown in place of the reader's own until Back clears it, so a
                 search result leads somewhere instead of just naming a person. */
              <FriendProfileView
                friendId={viewedPersonId}
                viewerId={session.user.id}
                onBack={() => setViewedPersonId(null)}
                onMessage={() => openFriendsFromProfile("messages")}
                expand
              />
            ) : (
              <MyProfileView
                userId={session.user.id}
                onDisplayNameSaved={() => setProfileVersion((v) => v + 1)}
                onClose={closeMyProfile}
                onGoToVerse={(reference) => {
                  closeMyProfile();
                  openVerse(reference);
                }}
                onOpenFriends={openFriendsFromProfile}
              />
            )}
          </div>
        )}
        {/* Games mode — same full-area takeover as Timeline/My Profile above. Unlike Timeline, this
            needs *some* session (the game RPCs require auth.uid()) — a guest session is fine, but a
            visitor who's never signed in at all (browsing this app doesn't force that choice, unlike
            some other panels) sees a prompt to continue as a guest instead of a blank overlay. */}
        {showGame && (
          <div className="game-mode">
            {session ? (
              <GameView session={session} onClose={closeGame} gameCenterNonce={gameCenterNonce} />
            ) : (
              <div className="game-signin-prompt">
                <BackButton onClick={closeGame} ariaLabel="Close Games" />
                <p>Sign in (or continue as a guest) to play multiplayer trivia.</p>
                <button
                  type="button"
                  className="games-primary-button"
                  onClick={() => {
                    setRememberMe(true);
                    supabase.auth.signInAnonymously();
                  }}
                >
                  Continue as Guest
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Fixed-position overlay (styled in App.css), not a child of map-area — on mobile it stays
          reachable while the reader flips to the Bible tab to read a stop's passage. */}
      {walkOpen && activeWalk && (
        <SeasonalWalkPanel walk={activeWalk} stopIndex={walkStopIndex} onGoToStop={goToWalkStop} onClose={closeWalk} />
      )}
      {isMobile && (
        <MobileTabBar
          active={activeMobilePanel}
          onSelect={(key, view) => {
            // Picking any panel tab leaves Timeline mode, Games mode, or My Profile — on mobile the
            // tab bar stays visible underneath all three full-screen takeovers, so tabs must keep
            // working as the way out of any of them.
            closeTimeline();
            closeGame();
            closeMyProfile();
            if (key === "friends" && view) handleSelectFriendsView(view);
            setMobileActivePanel(key);
          }}
          friendsBadgeCount={pendingFriendRequests}
          messagesBadgeCount={unreadMessages}
          groupsBadgeCount={groupsBadgeCount}
          onOpenProfile={() => {
            // Bumping this nonce pops the account flyout open (see AuthButton's effect), which must
            // only ever happen from a deliberate tap on "My Profile" in the mobile Social sheet —
            // guard on isMobile so no desktop path (e.g. a resize mid-tap) can ever route through.
            if (isMobile) setOpenProfileNonce((n) => (n ?? 0) + 1);
          }}
          onOpenTimeline={openTimeline}
          timelineActive={showTimeline}
          onOpenGame={() => {
            closeTimeline();
            closeMyProfile();
            openGame();
          }}
          gameActive={showGame}
          myProfileActive={showMyProfile}
          onOpenSocial={() => {
            closeTimeline();
            closeGame();
          }}
        />
      )}
    </div>
    </TimelineLinkContext.Provider>
  );
}

export default App;
