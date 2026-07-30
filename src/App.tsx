import { useEffect, useMemo, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import type { Session } from "@supabase/supabase-js";
import MapView from "./components/MapView";
import LayerControls from "./components/LayerControls";
import SearchBar from "./components/SearchBar";
import HeaderTextSearch from "./components/HeaderTextSearch";
import TimelineSearchBar from "./components/TimelineSearchBar";
import LocationPanel from "./components/LocationPanel";
import PoiPanel from "./components/PoiPanel";
import PersonPanel from "./components/PersonPanel";
import TopicPanel from "./components/TopicPanel";
import TimelineEventPanel from "./components/TimelineEventPanel";
import TimelineView from "./components/TimelineView";
import { TimelineLinkContext } from "./components/LinkChoicePopup";
import type { TimelineLinkHandlers } from "./components/LinkChoicePopup";
import BiblePanel from "./components/BiblePanel";
import MyNotesPanel from "./components/MyNotesPanel";
import FriendsPanel from "./components/FriendsPanel";
import ThenNowToggle, { type MapMode } from "./components/ThenNowToggle";
import PanelMenu, { type PanelKey } from "./components/PanelMenu";
import MobileTabBar from "./components/MobileTabBar";
import ResizeHandle from "./components/ResizeHandle";
import AuthButton from "./components/AuthButton";
import MyProfileView from "./components/MyProfileView";
import DisplayNameGate from "./components/DisplayNameGate";
import ResetPasswordGate from "./components/ResetPasswordGate";
import { supabase } from "./lib/supabase";
import { locations } from "./data/locations";
import { pois } from "./data/pois";
import { people } from "./data/people";
import { topics } from "./data/topics";
import { timelineEvents } from "./data/timelineEvents";
import { DAILY_VERSE_DISMISSED_KEY, formatDailyReference, getDailyVerse, getLocalDayKey } from "./data/dailyVerse";
import { formatWalkStopReference, getActiveSeasonalWalk, getWalkDismissKey } from "./data/seasonalWalks";
import SeasonalWalkPanel from "./components/SeasonalWalkPanel";
import "./App.css";

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 800;
const MOBILE_QUERY = "(max-width: 768px)";

/** One entry in the details "back" trail — enough to restore a prior selection without re-deriving it. */
type DetailsSelection =
  | { kind: "location"; id: string }
  | { kind: "poi"; id: string }
  | { kind: "person"; id: string }
  | { kind: "topic"; id: string }
  | { kind: "timelineEvent"; id: string };

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
  // True once the initial supabase.auth.getSession() call has settled (whether or not it found a
  // session) — `session` alone can't tell "haven't checked yet" apart from "genuinely logged out",
  // and BiblePanel's cold-start welcome screen needs that distinction (see bibleInitializing below).
  const [authResolved, setAuthResolved] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
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
  // Mobile has exactly one active panel at a time, switched via the bottom tab bar.
  const setMobileActivePanel = (key: PanelKey) =>
    applyPanels({
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
      details: false,
      notes: false,
      friends: false,
    };
    // Details only renders on desktop with a live selection; leaving it closed here avoids an
    // invisible panel holding an LRU slot (it reopens on the next selection anyway).
    if (active && active !== "details") next[active] = true;
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
      });
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthResolved(true);
    });
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

  // --- My Profile mode ----------------------------------------------------------------------------
  // Full-screen "My Profile" (MyProfileView), same top-level takeover pattern as Timeline mode below:
  // a boolean here renders it over the whole app-body, with its own header and Back button, entered
  // from the desktop account menu or the mobile "More" sheet's "My Profile" entry (both via AuthButton)
  // and left via its own Back button — replaces the small anchored dropdown this used to be.
  const [showMyProfile, setShowMyProfile] = useState(false);
  const openMyProfile = () => setShowMyProfile(true);
  const closeMyProfile = () => setShowMyProfile(false);
  // Bumped whenever MyProfileView saves a display-name change, so AuthButton's own fetch (which only
  // otherwise re-runs on a session change) knows to refresh the label it shows.
  const [profileVersion, setProfileVersion] = useState(0);
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

  // Gates BiblePanel's cold-start welcome screen (see the `initializing` prop passed to it below)
  // until we actually know whether there's a saved reading position to jump to — otherwise a
  // returning signed-in reader briefly sees the welcome screen (with its reading-plan cards) flash
  // before the restored chapter replaces it. Resolves near-instantly for a logged-out/guest visitor
  // (no reading_progress lookup to wait on), so this doesn't add a perceptible delay for them.
  const bibleInitializing = !authResolved || (!!session && !restoreChecked);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
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
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
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
    setSelectedTopicId(null);
    setSelectedTimelineEventId(null);
    if (isMobile) setMobileActivePanel("details");
    else openPanel("details");
  };

  // Topics (practices, doctrines, people groups) have no map presence, same as people — selecting one
  // just opens the Details panel.
  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTimelineEventId(null);
    if (isMobile) setMobileActivePanel("details");
    else openPanel("details");
  };

  // Timeline events have no map presence either — same pattern as people and topics: selecting one
  // just opens the Details panel.
  const handleSelectTimelineEvent = (id: string) => {
    setSelectedTimelineEventId(id);
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedPersonId(null);
    setSelectedTopicId(null);
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
  const handleSelectPersonFromBible = (id: string) => {
    setDetailsHistory([]);
    handleSelectPerson(id);
  };

  // A topic link inside the Bible text — same pattern as person: no map presence, fresh starting point.
  const handleSelectTopicFromBible = (id: string) => {
    setDetailsHistory([]);
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

  /** Leave Timeline mode and run a normal navigation — used by every cross-link inside the
   * in-mode TimelineEventPanel overlay, so following a person/place link lands the reader back in
   * the regular app on that entity's page. */
  const exitTimelineThen = (navigate: () => void) => {
    closeTimeline();
    navigate();
  };

  const goBackInDetails = () => {
    if (detailsHistory.length === 0) return;
    const prev = detailsHistory[detailsHistory.length - 1];
    setDetailsHistory((h) => h.slice(0, -1));
    if (prev.kind === "location") handleSelect(prev.id);
    else if (prev.kind === "poi") handleSelectPoi(prev.id);
    else if (prev.kind === "topic") handleSelectTopic(prev.id);
    else if (prev.kind === "timelineEvent") handleSelectTimelineEvent(prev.id);
    else handleSelectPerson(prev.id);
  };

  const hasSelection =
    selectedId !== null ||
    selectedPoiId !== null ||
    selectedPersonId !== null ||
    selectedTopicId !== null ||
    selectedTimelineEventId !== null;
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
    // On desktop the Details panel can't render without a selection (showDetails goes false), so
    // close it in state too — otherwise the invisible panel keeps holding one of the LRU slots
    // while the menu's disabled Details row leaves no way to free it.
    else closePanel("details");
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

  // --- Verse & Place of the Day ---------------------------------------------------------------
  // Deterministic daily rotation (see dailyVerse.ts) pairing a passage with its place on the map —
  // shown to everyone (signed in or not) as an inviting entry point instead of blank pickers.
  // Computed once per app load; any close persists today's day-key so the card stays gone until
  // tomorrow, when a fresh key (and a fresh entry) brings it back.
  const [dailyVerse] = useState(() => getDailyVerse());
  const [dailyVerseOpen, setDailyVerseOpen] = useState(
    () => localStorage.getItem(DAILY_VERSE_DISMISSED_KEY) !== getLocalDayKey()
  );
  const dismissDailyVerse = () => {
    localStorage.setItem(DAILY_VERSE_DISMISSED_KEY, getLocalDayKey());
    setDailyVerseOpen(false);
  };
  const dailyVerseReference = formatDailyReference(dailyVerse);
  const dailyVersePlace = locations.find((l) => l.id === dailyVerse.locationId) ?? null;
  const viewDailyVerseOnMap = () => {
    dismissDailyVerse();
    focusLocationOnMap(dailyVerse.locationId);
  };

  // The card shows the verse's own text inline (not just its reference) — fetched once per app
  // load the same way BiblePanel loads a chapter, since the text isn't duplicated into this file.
  const [dailyVerseText, setDailyVerseText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`https://bible-api.com/${encodeURIComponent(dailyVerseReference)}?translation=web`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.text) setDailyVerseText(data.text.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A signed-in reader's written response to the daily prompt — posted as a note (the same
  // mechanism behind "My Notes" -> Public and the profile Posts feed) rather than a new table, so a
  // public response shows up on their own profile exactly like any other shared note would. Public by
  // default (most people posting here want it on their profile), but the form below lets them choose
  // private instead before submitting — same public/private idiom as MyNotesPanel/PostsFeed.
  const [dailyVerseResponse, setDailyVerseResponse] = useState("");
  const [dailyVerseResponsePublic, setDailyVerseResponsePublic] = useState(true);
  const [dailyVerseResponseStatus, setDailyVerseResponseStatus] = useState<"idle" | "saving" | "saved">("idle");
  const postDailyVerseResponse = async () => {
    const text = dailyVerseResponse.trim();
    if (!text || !session) return;
    setDailyVerseResponseStatus("saving");
    const { error: postError } = await supabase.from("notes").insert({
      user_id: session.user.id,
      book: dailyVerse.reference.book,
      chapter: dailyVerse.reference.chapter,
      start_verse: dailyVerse.reference.verse,
      end_verse: dailyVerse.reference.verse,
      translation: "web",
      quoted_text: dailyVerseText,
      note_text: text,
      is_public: dailyVerseResponsePublic,
    });
    if (postError) {
      setDailyVerseResponseStatus("idle");
      return;
    }
    setDailyVerseResponseStatus("saved");
    setNotesVersion((n) => n + 1);
  };

  // --- Seasonal walks (Holy Week, Advent) ------------------------------------------------------
  // A dismissible banner pill under the header — deliberately NOT another modal, since the daily
  // verse card already owns that moment — shown only while today falls in a walk's season window.
  // Computed once per app load like dailyVerse; dismissal persists per season occurrence (see
  // getWalkDismissKey), so one × keeps it gone until that season comes around next year.
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

  // The details panel has nothing to show without a selection on desktop — hiding it lets the
  // map expand instead of leaving a blank panel visible. On mobile it always renders (as its own
  // full-screen tab) so the empty state ("search or click a pin") shows instead of a blank tab.
  const showDetails = panels.details && (hasSelection || isMobile);
  const noPanelsOpen = !panels.bible && !panels.map && !panels.notes && !panels.friends && !showDetails;
  // The hamburger checklist mirrors what's actually on screen: its Details row tracks showDetails
  // rather than raw panels.details, which can be "open" in state while nothing renders (desktop with
  // no selection) — a checked box next to an invisible panel reads as a broken toggle.
  const menuPanels: Record<PanelKey, boolean> = { ...panels, details: showDetails };
  const toggleMenuPanel = (key: PanelKey) => (menuPanels[key] ? closePanel(key) : openPanel(key));
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
  // a location, Bible runs a word/phrase search, Notes filters live, Timeline searches timeline
  // events) rather than one generic bar, so only one can be "active" at a time. On desktop, where
  // Bible+Map are often open together, Map wins ties (unchanged from the original map-only behavior)
  // since it's the more common case.
  //
  // Timeline mode is checked FIRST, ahead of the panel/mobile-tab logic below: `showTimeline` is a
  // separate top-level takeover, not one of the PanelKey values those branches switch on, and the
  // panels underneath stay mounted (with their own panels.bible/panels.map truthy) the whole time
  // Timeline is open. Without this early case, opening Timeline while Bible (or Map) was last active
  // fell through to that stale panel state and kept showing Bible's/Map's search bar and behavior on
  // top of Timeline — the bug this early-out fixes.
  const searchMode: "map" | "bible" | "notes" | "timeline" | null = showTimeline
    ? "timeline"
    : isMobile
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
    <TimelineLinkContext.Provider value={timelineLinkHandlers}>
    <div className="app-shell">
      {passwordRecovery && session && <ResetPasswordGate onDone={() => setPasswordRecovery(false)} />}
      {!passwordRecovery && needsDisplayName && session && (
        <DisplayNameGate userId={session.user.id} onSaved={() => setNeedsDisplayName(false)} />
      )}
      {/* Verse & Place of the Day — never over the account gates, which must be dealt with first.
          Clicking the backdrop counts as a dismissal (persisted for the day) like the × does. */}
      {dailyVerseOpen && !passwordRecovery && !needsDisplayName && (
        <div className="daily-verse-overlay" onClick={dismissDailyVerse}>
          <div
            className="daily-verse-card"
            role="dialog"
            aria-label="Verse and Place of the Day"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="daily-verse-close" onClick={dismissDailyVerse} aria-label="Dismiss for today">
              ×
            </button>
            <div className="daily-verse-eyebrow">Verse &amp; Place of the Day</div>
            <h2 className="daily-verse-reference">{dailyVerseReference}</h2>
            {dailyVersePlace && <div className="daily-verse-place">📍 {dailyVersePlace.name}</div>}
            {dailyVerseText && <p className="daily-verse-text">"{dailyVerseText}"</p>}
            <p className="daily-verse-note">{dailyVerse.verseNote}</p>
            <p className="daily-verse-prompt">{dailyVerse.prompt}</p>
            {session ? (
              dailyVerseResponseStatus === "saved" ? (
                <p className="daily-verse-response-saved">
                  {dailyVerseResponsePublic
                    ? "Posted to your profile. Thanks for sharing."
                    : "Saved privately to your notes."}
                </p>
              ) : (
                <form
                  className="daily-verse-response-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    postDailyVerseResponse();
                  }}
                >
                  <textarea
                    className="daily-verse-response-input"
                    value={dailyVerseResponse}
                    onChange={(e) => setDailyVerseResponse(e.target.value)}
                    placeholder="Write your response…"
                    rows={3}
                    maxLength={2000}
                  />
                  <label className="my-notes-public-toggle">
                    <input
                      type="checkbox"
                      checked={dailyVerseResponsePublic}
                      onChange={(e) => setDailyVerseResponsePublic(e.target.checked)}
                    />
                    {dailyVerseResponsePublic ? "🌐 Share publicly on my profile" : "🔒 Keep private"}
                  </label>
                  <button
                    type="submit"
                    className="daily-verse-response-submit"
                    disabled={!dailyVerseResponse.trim() || dailyVerseResponseStatus === "saving"}
                  >
                    {dailyVerseResponseStatus === "saving" ? "Posting…" : dailyVerseResponsePublic ? "Post to my profile" : "Save privately"}
                  </button>
                </form>
              )
            ) : (
              <p className="daily-verse-response-signed-out">Log in to write and share a response.</p>
            )}
            <div className="daily-verse-actions">
              <button type="button" className="daily-verse-map" onClick={viewDailyVerseOnMap}>
                View Location
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="app-header">
        <PanelMenu
          panels={menuPanels}
          onToggle={toggleMenuPanel}
          lastAutoClosed={lastAutoClosed}
          disabled={
            // Mirrors showDetails: on desktop with nothing selected the Details panel can't render,
            // so its row is dimmed instead of letting a click evict a visible panel for nothing.
            // (Mobile always renders Details' empty state, but the menu is hidden there anyway.)
            hasSelection || isMobile ? undefined : { details: "Select a place on the map or in the text first" }
          }
          friendsBadgeCount={pendingFriendRequests + unreadMessages + groupsBadgeCount}
        />
        <button type="button" className="app-logo-button" onClick={goHome} aria-label="Go to Bible">
          <img src="/favicon.svg" className="app-logo" alt="" aria-hidden="true" />
        </button>
        <h1>Biblical Atlas</h1>
        {searchMode === "map" && (
          <SearchBar
            locations={locations}
            onSelect={focusLocationOnMap}
            selectedLocationName={selectedLocation?.name ?? null}
          />
        )}
        {searchMode === "bible" && (
          <HeaderTextSearch
            placeholder="Search Scripture…"
            icon="📖"
            value={bibleSearchQuery}
            onChange={setBibleSearchQuery}
            onSubmit={() => setBibleSearchNonce((n) => n + 1)}
          />
        )}
        {searchMode === "notes" && (
          <HeaderTextSearch
            placeholder="Search My Notes"
            icon="📝"
            value={notesSearchQuery}
            onChange={setNotesSearchQuery}
          />
        )}
        {searchMode === "timeline" && (
          <TimelineSearchBar events={timelineEvents} onSelect={handleSelectTimelineSearchResult} />
        )}
        <AuthButton
          session={session}
          openProfileNonce={openProfileNonce}
          onOpenReadingPlans={openReadingPlans}
          onOpenMyProfile={openMyProfile}
          profileVersion={profileVersion}
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
            onSelectTopic={handleSelectTopicFromDetails}
            onJournalPrompt={session ? handleJournalPrompt : undefined}
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
            onSelectTopic={handleSelectTopicFromDetails}
            onSelectVerse={openVerse}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {showDetails && !selectedPerson && !selectedPoi && selectedTopic && (
          <TopicPanel
            topic={selectedTopic}
            onBack={detailsHistory.length > 0 ? goBackInDetails : undefined}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onJournalPrompt={session ? handleJournalPrompt : undefined}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {showDetails && !selectedPerson && !selectedPoi && !selectedTopic && selectedTimelineEvent && (
          <TimelineEventPanel
            event={selectedTimelineEvent}
            onBack={detailsHistory.length > 0 ? goBackInDetails : undefined}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onSelectTimelineEvent={handleSelectTimelineEventFromDetails}
            expand={sideExpand}
            style={{ width: detailsWidth }}
          />
        )}
        {showDetails && !selectedPerson && !selectedPoi && !selectedTopic && !selectedTimelineEvent && (
          <LocationPanel
            location={selectedLocation}
            onBack={detailsHistory.length > 0 ? goBackInDetails : undefined}
            onSelectVerse={openVerse}
            onSelectLocation={handleSelectLocationFromDetails}
            onSelectPoi={handleSelectPoiFromDetails}
            onSelectPerson={handleSelectPersonFromDetails}
            onSelectTopic={handleSelectTopicFromDetails}
            onJournalPrompt={session ? handleJournalPrompt : undefined}
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
            // Study-trip stop actions — the same paths the Bible panel's place links use (focus a
            // location/POI on the map without opening Details) and openVerse (load a passage).
            onSelectLocation={focusLocationOnMap}
            onSelectPoi={handleSelectPoiFromBible}
            onGoToReference={openVerse}
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
              onSelectPerson={(id) => exitTimelineThen(() => handleSelectPersonFromBible(id))}
              onSelectBook={(book) => exitTimelineThen(() => openVerse(`${book} 1`))}
              focusEntityId={timelineFocusEntityId ?? undefined}
            />
            {/* Selecting an event opens its article as a slide-in overlay on top of the timeline —
                same panel component the Details column uses, so it feels native. Back returns to
                the timeline; any cross-link exits the mode into the normal app. */}
            {timelineOverlayEvent && (
              <div className="timeline-event-overlay">
                <TimelineEventPanel
                  event={timelineOverlayEvent}
                  onBack={() => setTimelineOverlayEventId(null)}
                  onSelectVerse={(ref) => exitTimelineThen(() => openVerse(ref))}
                  onSelectLocation={(id) =>
                    exitTimelineThen(() => {
                      setDetailsHistory([]);
                      handleSelect(id);
                    })
                  }
                  onSelectPoi={(id) =>
                    exitTimelineThen(() => {
                      setDetailsHistory([]);
                      handleSelectPoi(id);
                    })
                  }
                  onSelectPerson={(id) => exitTimelineThen(() => handleSelectPersonFromBible(id))}
                  onSelectTopic={(id) => exitTimelineThen(() => handleSelectTopicFromBible(id))}
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
        {showMyProfile && session && !session.user.is_anonymous && (
          <div className="myprofile-mode">
            <MyProfileView
              userId={session.user.id}
              onDisplayNameSaved={() => setProfileVersion((v) => v + 1)}
              onClose={closeMyProfile}
              onGoToVerse={(reference) => {
                closeMyProfile();
                openVerse(reference);
              }}
            />
          </div>
        )}
      </div>
      {/* Slim always-visible footer strip — the desktop entry point to Timeline mode (mobile gets
          its own tab in the bottom bar instead). Clicking it again closes the mode. */}
      {!isMobile && (
        <footer className="app-footer">
          <button
            type="button"
            className={`app-footer-timeline${showTimeline ? " active" : ""}`}
            onClick={showTimeline ? closeTimeline : openTimeline}
            aria-pressed={showTimeline}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 2.2h8M4 13.8h8M4.6 2.2c0 2.6 0 3.5 3.4 5.8 3.4-2.3 3.4-3.2 3.4-5.8M4.6 13.8c0-2.6 0-3.5 3.4-5.8 3.4 2.3 3.4 3.2 3.4 5.8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="app-footer-timeline-label">Timeline</span>
            <span className="app-footer-timeline-tagline">— journey through biblical &amp; world history</span>
          </button>
        </footer>
      )}
      {/* Fixed-position overlay (styled in App.css), not a child of map-area — on mobile it stays
          reachable while the reader flips to the Bible tab to read a stop's passage. */}
      {walkOpen && activeWalk && (
        <SeasonalWalkPanel walk={activeWalk} stopIndex={walkStopIndex} onGoToStop={goToWalkStop} onClose={closeWalk} />
      )}
      {isMobile && (
        <MobileTabBar
          active={activeMobilePanel}
          hasSelection={hasSelection}
          onSelect={(key, view) => {
            // Picking any panel tab leaves Timeline mode or My Profile — on mobile the tab bar
            // stays visible underneath both full-screen takeovers, so tabs must keep working as
            // the way out of either one.
            closeTimeline();
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
          myProfileActive={showMyProfile}
          onOpenSocial={() => {
            closeTimeline();
            closeMyProfile();
          }}
        />
      )}
    </div>
    </TimelineLinkContext.Provider>
  );
}

export default App;
