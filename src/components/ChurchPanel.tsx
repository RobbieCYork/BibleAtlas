import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import ViewSwitcher, { type FriendsView } from "./ViewSwitcher";
import BackButton from "./BackButton";
import Icon from "./Icon";
import SermonNoteEditor, { type SermonEditorDraft } from "./SermonNoteEditor";
import { noteBodyToHtml, sanitizeNoteHtml } from "../lib/richText";
import { resolveNoteImages } from "../lib/noteImages";
import { qrSvg } from "../lib/qrCode";
import {
  CHURCH_ROLE_BLURBS,
  CHURCH_ROLE_LABELS,
  addChurchMember,
  churchInviteUrl,
  createChurch,
  createChurchSermon,
  fetchChurch,
  fetchChurchJoinRequests,
  fetchChurchMembers,
  fetchChurchSermons,
  fetchForkedSermonIds,
  fetchMyChurches,
  forkChurchSermon,
  humanizeChurchError,
  removeChurchMember,
  respondToChurchJoinRequest,
  setChurchRole,
  softDeleteChurch,
  softDeleteChurchSermon,
  updateChurchProfile,
  updateChurchSermon,
  type Church,
  type ChurchJoinRequestRow,
  type ChurchMemberRow,
  type ChurchRole,
  type ChurchSermon,
  type ChurchSummary,
} from "../lib/churchApi";

/* ============================================================================
 * Capstone for Churches, Stage 1 — the whole client surface.
 *
 * A structural clone of GroupsPanel.tsx, on purpose: register, invite link, QR
 * code, member list, approve/remove, promote. The membership UX in that file has
 * been debugged in front of real users and none of it is worth reinventing.
 *
 * What it deliberately does NOT clone is the TABLE. A church is a separate
 * entity with its own policy set, not `groups.kind = 'church'` — see §2.1 of
 * automation/manager/churches-scope.md, and the header of sql/033.
 *
 * ── THE PROMISE THIS SCREEN MAKES, AND THE DATABASE KEEPS ───────────────────
 * A member forks an outline into their OWN sermon note and the church can never
 * see it, change it, or delete it. That is not enforced here. It is enforced by
 * sermon_notes' RLS being `auth.uid() = user_id` and by sql/033 adding no policy
 * and no grant to that table. Nothing in this file could be edited to break it,
 * which is the point of putting it there rather than here.
 *
 * ── STAGE 1 HAS NO PUBLIC SURFACE ───────────────────────────────────────────
 * No directory, no verification, no `/church/<slug>` page, and no search box.
 * find_churches() is shipped in sql/033 so Stage 3 needs no migration, but it
 * can only return `is_listed and verified` churches and nothing in Stage 1 can
 * set either flag — so a search box here could only ever come back empty, and a
 * control that cannot succeed is worse than no control. People arrive by invite
 * link or QR code, which is how a congregation actually joins anything.
 * ========================================================================== */

type Screen = "list" | "create" | "detail" | "sermon";
type DetailTab = "sermons" | "members" | "about";

interface ChurchPanelProps {
  session: Session | null;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
  /** Increments every time Church is (re-)selected from the nav — resets back to the list screen,
   * matching how Friends/Messages/Groups reset to their own top-level list. */
  openViewNonce?: number;
  onSelectView?: (view: FriendsView) => void;
  friendsBadgeCount?: number;
  messagesBadgeCount?: number;
  groupsBadgeCount?: number;
  /** A church id to open straight away — set by App when a `?joinChurch=` link has just been
   * honoured, so the person lands inside the church they were invited to rather than on a list. */
  openChurchId?: string | null;
  onOpenedChurch?: () => void;
  /** Hands a freshly forked note to My Notes → Sermon Notes, which opens it in the same editor the
   * reader already knows. The fork is an ordinary row of their own `sermon_notes`; this is a
   * navigation call, not a data one. */
  onOpenSermonNote?: (noteId: string) => void;
}

/** A church's outline, rendered read-only for a member who has not forked it yet.
 *
 * innerHTML through a ref rather than `dangerouslySetInnerHTML`, for the reason RichTextEditor
 * gives at length: the images in a body store a storage PATH, not a URL, and something has to mint
 * a signed URL for each one after the markup is in the DOM. That needs the node. The markup is run
 * through the same sanitiser the editor writes with, on the way in as well as the way out — a
 * church's outline is content written by another account, and the fact that it was sanitised when
 * it was saved is not a reason to trust it when it is read. */
function SermonBodyView({ body }: { body: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const html = useMemo(() => sanitizeNoteHtml(noteBodyToHtml(body)), [body]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerHTML = html;
    void resolveNoteImages(node);
  }, [html]);
  // `rte-surface` is carried deliberately: every rule for the marks a body can hold — paragraphs,
  // lists, `blockquote.sn-scripture`, `img.sn-image`, the colour swatches — is written against that
  // class in App.css. Reusing it is what makes a read outline look like the note it becomes, rather
  // than like a second, slightly-wrong renderer. It carries no editor behaviour: the two rules that
  // would (`:focus`, and the `[data-empty]` placeholder) cannot fire on a div that is neither
  // focusable nor given that attribute.
  return <div className="church-sermon-body rte-surface" ref={ref} />;
}

function formatServiceDate(value: string | null): string {
  if (!value) return "";
  // A `date` column arrives as "YYYY-MM-DD". Parsed as UTC by the Date constructor and then
  // formatted in local time, a service on the 7th shows as the 6th for anyone west of Greenwich —
  // so the parts are read off the string rather than through a timezone at all.
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function ChurchPanel({
  session,
  expand,
  style,
  hidden,
  openViewNonce,
  onSelectView,
  friendsBadgeCount,
  messagesBadgeCount,
  groupsBadgeCount,
  openChurchId,
  onOpenedChurch,
  onOpenSermonNote,
}: ChurchPanelProps) {
  const userId = session?.user.id;
  const canUse = !!session && !session.user.is_anonymous;

  const [screen, setScreen] = useState<Screen>("list");
  const [churches, setChurches] = useState<ChurchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [activeChurchId, setActiveChurchId] = useState<string | null>(null);
  const [activeChurch, setActiveChurch] = useState<Church | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("sermons");
  const [members, setMembers] = useState<ChurchMemberRow[]>([]);
  const [joinRequests, setJoinRequests] = useState<ChurchJoinRequestRow[]>([]);
  const [sermons, setSermons] = useState<ChurchSermon[]>([]);
  const [forkedIds, setForkedIds] = useState<Set<string>>(new Set());

  // --- register a church ---
  const [newChurch, setNewChurch] = useState({
    name: "",
    city: "",
    region: "",
    country: "",
    denomination: "",
    website: "",
    phone: "",
    about: "",
    serviceTimes: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // --- profile editing ---
  const [editingInfo, setEditingInfo] = useState(false);
  const [editDraft, setEditDraft] = useState<Church | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);

  // --- invite / add ---
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [addContact, setAddContact] = useState("");
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // --- the outline being read or written ---
  const [activeSermon, setActiveSermon] = useState<ChurchSermon | null>(null);
  const [sermonScreen, setSermonScreen] = useState<"read" | "edit">("read");
  const [sermonSession, setSermonSession] = useState(0);
  const [sermonDate, setSermonDate] = useState("");
  const [sermonSeries, setSermonSeries] = useState("");
  const [forking, setForking] = useState(false);

  const summary = churches.find((c) => c.church_id === activeChurchId) ?? null;
  const myRole: ChurchRole | null = summary?.my_role ?? null;
  const isChurchAdmin = myRole === "admin";
  const isStaff = myRole === "admin" || myRole === "staff";

  const refreshChurches = async (force = true) => {
    if (!userId) return;
    setLoading(true);
    try {
      setChurches(await fetchMyChurches(force));
    } catch (e) {
      setStatus(humanizeChurchError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshChurches(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (openViewNonce === undefined) return;
    setScreen("list");
    setActiveChurchId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openViewNonce]);

  const loadDetail = async (churchId: string, role: ChurchRole | null) => {
    try {
      const [church, memberRows, sermonRows] = await Promise.all([
        fetchChurch(churchId),
        fetchChurchMembers(churchId),
        fetchChurchSermons(churchId),
      ]);
      setActiveChurch(church);
      setMembers(memberRows);
      setSermons(sermonRows);
      if (userId) setForkedIds(await fetchForkedSermonIds(userId));
      if (role === "admin") setJoinRequests(await fetchChurchJoinRequests(churchId));
      else setJoinRequests([]);
    } catch (e) {
      setStatus(humanizeChurchError(e));
    }
  };

  const openChurch = (churchId: string, role?: ChurchRole | null) => {
    setActiveChurchId(churchId);
    setDetailTab("sermons");
    setEditingInfo(false);
    setInviteOpen(false);
    setInviteStatus(null);
    setAddStatus(null);
    setConfirmingClose(false);
    setStatus(null);
    setScreen("detail");
    void loadDetail(churchId, role ?? churches.find((c) => c.church_id === churchId)?.my_role ?? null);
  };

  // An invite link that has just been honoured lands here.
  useEffect(() => {
    if (!openChurchId || !userId) return;
    let cancelled = false;
    void (async () => {
      const rows = await fetchMyChurches(true).catch(() => [] as ChurchSummary[]);
      if (cancelled) return;
      setChurches(rows);
      const mine = rows.find((c) => c.church_id === openChurchId);
      if (mine) openChurch(mine.church_id, mine.my_role);
      onOpenedChurch?.();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChurchId, userId]);

  /* ---- register --------------------------------------------------------- */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurch.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const id = await createChurch({
        name: newChurch.name,
        city: newChurch.city,
        region: newChurch.region,
        country: newChurch.country,
        denomination: newChurch.denomination,
        website: newChurch.website,
        phone: newChurch.phone,
        about: newChurch.about,
        serviceTimes: newChurch.serviceTimes,
      });
      const rows = await fetchMyChurches(true);
      setChurches(rows);
      openChurch(id, "admin");
    } catch (err) {
      setCreateError(humanizeChurchError(err));
    } finally {
      setCreating(false);
    }
  };

  /* ---- profile ---------------------------------------------------------- */

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChurchId || !editDraft || !editDraft.name.trim()) return;
    setSavingInfo(true);
    try {
      await updateChurchProfile(activeChurchId, {
        name: editDraft.name.trim(),
        city: editDraft.city?.trim() || null,
        region: editDraft.region?.trim() || null,
        country: editDraft.country?.trim() || null,
        website: editDraft.website?.trim() || null,
        phone: editDraft.phone?.trim() || null,
        address_line1: editDraft.address_line1?.trim() || null,
        address_line2: editDraft.address_line2?.trim() || null,
        postal_code: editDraft.postal_code?.trim() || null,
        denomination: editDraft.denomination?.trim() || null,
        about: editDraft.about?.trim() || null,
        service_times: editDraft.service_times?.trim() || null,
        open_join: editDraft.open_join,
      });
      setEditingInfo(false);
      await refreshChurches();
      setActiveChurch(await fetchChurch(activeChurchId));
    } catch (err) {
      setStatus(humanizeChurchError(err));
    } finally {
      setSavingInfo(false);
    }
  };

  /* ---- membership ------------------------------------------------------- */

  const handleCopyInvite = async () => {
    if (!activeChurchId) return;
    const link = churchInviteUrl(activeChurchId);
    try {
      await navigator.clipboard.writeText(link);
      setInviteStatus("Invite link copied.");
    } catch {
      setInviteStatus(link);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addContact.trim();
    if (!activeChurchId || !query) return;
    setAdding(true);
    setAddStatus(null);
    const isEmail = query.includes("@");
    const { data: foundId, error: lookupErr } = isEmail
      ? await supabase.rpc("find_user_id_by_email", { lookup_email: query })
      : await supabase.rpc("find_user_by_contact", { query: query.replace(/\D/g, "") });
    if (lookupErr || !foundId) {
      setAddStatus(isEmail ? "No account found with that email." : "No account found with that phone number.");
      setAdding(false);
      return;
    }
    try {
      await addChurchMember(activeChurchId, foundId as string);
      setAddStatus("Added.");
      setAddContact("");
      await loadDetail(activeChurchId, myRole);
      await refreshChurches();
    } catch (err) {
      setAddStatus(humanizeChurchError(err));
    } finally {
      setAdding(false);
    }
  };

  const handleSetRole = async (memberId: string, role: ChurchRole) => {
    if (!activeChurchId) return;
    try {
      await setChurchRole(activeChurchId, memberId, role);
      await loadDetail(activeChurchId, myRole);
    } catch (err) {
      setStatus(humanizeChurchError(err));
    }
  };

  const handleRemove = async (memberUserId: string) => {
    if (!activeChurchId) return;
    try {
      await removeChurchMember(activeChurchId, memberUserId);
      if (memberUserId === userId) {
        setScreen("list");
        setActiveChurchId(null);
        await refreshChurches();
        return;
      }
      await loadDetail(activeChurchId, myRole);
      await refreshChurches();
    } catch (err) {
      setStatus(humanizeChurchError(err));
    }
  };

  const handleRespond = async (requestId: string, approve: boolean) => {
    if (!activeChurchId) return;
    try {
      await respondToChurchJoinRequest(requestId, approve);
      await loadDetail(activeChurchId, myRole);
      await refreshChurches();
    } catch (err) {
      setStatus(humanizeChurchError(err));
    }
  };

  const handleCloseChurch = async () => {
    if (!activeChurchId) return;
    try {
      await softDeleteChurch(activeChurchId);
      setScreen("list");
      setActiveChurchId(null);
      setConfirmingClose(false);
      await refreshChurches();
    } catch (err) {
      setStatus(humanizeChurchError(err));
    }
  };

  /* ---- outlines --------------------------------------------------------- */

  const openSermon = (sermon: ChurchSermon | null, mode: "read" | "edit") => {
    setActiveSermon(sermon);
    setSermonScreen(mode);
    setSermonDate(sermon?.service_date ?? "");
    setSermonSeries(sermon?.series ?? "");
    setSermonSession((n) => n + 1);
    setScreen("sermon");
  };

  /** The editor's injected save, bound to `church_sermons` instead of `sermon_notes`. Same
   * component, same body format, different table — see SermonNoteEditor's header for why that
   * split is the design and not an accident. */
  const handleSaveSermon = async (draft: SermonEditorDraft, isNew: boolean): Promise<boolean> => {
    if (!activeChurchId || !userId) return false;
    try {
      if (isNew) {
        const created = await createChurchSermon(activeChurchId, userId, {
          title: draft.title,
          speaker_name: draft.speaker || null,
          scripture_ref: draft.scriptureRef || null,
          service_date: sermonDate || null,
          series: sermonSeries || null,
          body: draft.body,
          status: "draft",
        });
        setActiveSermon(created);
        setSermons((prev) => [created, ...prev]);
        return true;
      }
      if (!activeSermon) return false;
      const saved = await updateChurchSermon(activeSermon.id, {
        title: draft.title,
        speaker_name: draft.speaker || null,
        scripture_ref: draft.scriptureRef || null,
        service_date: sermonDate || null,
        series: sermonSeries || null,
        body: draft.body,
      });
      setActiveSermon(saved);
      setSermons((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      return true;
    } catch (err) {
      setStatus(humanizeChurchError(err));
      return false;
    }
  };

  const handlePublishToggle = async () => {
    if (!activeSermon) return;
    try {
      const next = activeSermon.status === "published" ? "draft" : "published";
      const saved = await updateChurchSermon(activeSermon.id, { status: next });
      setActiveSermon(saved);
      setSermons((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      await refreshChurches();
    } catch (err) {
      setStatus(humanizeChurchError(err));
    }
  };

  const handleDeleteSermon = async () => {
    if (!activeSermon || !activeChurchId) return;
    try {
      await softDeleteChurchSermon(activeSermon.id);
      setSermons((prev) => prev.filter((s) => s.id !== activeSermon.id));
      setScreen("detail");
      await refreshChurches();
    } catch (err) {
      setStatus(humanizeChurchError(err));
    }
  };

  /** "Take notes on this". One RPC, one new row of the reader's OWN sermon_notes, pre-filled with
   * a SNAPSHOT of the outline as it stands right now — never live-linked, so the pastor tidying a
   * heading at 10:42 does not reflow the document under a congregant's cursor. */
  const handleFork = async (sermon: ChurchSermon) => {
    setForking(true);
    try {
      const noteId = await forkChurchSermon(sermon.id);
      setForkedIds((prev) => new Set(prev).add(sermon.id));
      onOpenSermonNote?.(noteId);
    } catch (err) {
      setStatus(humanizeChurchError(err));
    } finally {
      setForking(false);
    }
  };

  const panelClass = `friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`;

  /* ======================= the outline screen ============================ */

  if (screen === "sermon") {
    const readOnly = sermonScreen === "read" || !isStaff;
    if (!readOnly) {
      return (
        <div className={panelClass} style={expand ? undefined : style}>
          <SermonNoteEditor
            key={sermonSession}
            sessionKey={sermonSession}
            userId={userId as string}
            initialTitle={activeSermon?.title ?? ""}
            initialSpeaker={activeSermon?.speaker_name ?? ""}
            initialScriptureRef={activeSermon?.scripture_ref ?? ""}
            initialBody={activeSermon?.body ?? ""}
            startsUnsaved={!activeSermon}
            titlePlaceholder="Sermon outline"
            bodyPlaceholder="Type or paste the outline your congregation will take notes on…"
            bodyAriaLabel="Sermon outline body"
            speakerPlaceholder="Speaker"
            backLabel="Back to the church"
            onBack={() => {
              setScreen("detail");
              if (activeChurchId) void loadDetail(activeChurchId, myRole);
            }}
            onSave={handleSaveSermon}
            onDelete={activeSermon ? handleDeleteSermon : undefined}
            deletePrompt="Remove this outline? Nobody's own notes are affected."
            deleteLabel="Remove outline"
            banner={
              <p className="church-sermon-banner">
                <Icon name="church" inline /> {activeChurch?.name ?? "Your church"} ·{" "}
                {activeSermon?.status === "published" ? "Published — your members can see this" : "Draft — only staff can see this"}
              </p>
            }
            toolbarExtra={
              activeSermon ? (
                <button type="button" className="church-publish-button" onClick={handlePublishToggle}>
                  {activeSermon.status === "published" ? "Unpublish" : "Publish"}
                </button>
              ) : undefined
            }
            extraFields={
              <div className="sermon-notes-meta-row church-sermon-extra">
                <label className="church-field">
                  <span>Service date</span>
                  <input type="date" value={sermonDate} onChange={(e) => setSermonDate(e.target.value)} />
                </label>
                <label className="church-field">
                  <span>Series (optional)</span>
                  <input
                    type="text"
                    value={sermonSeries}
                    onChange={(e) => setSermonSeries(e.target.value)}
                    placeholder="e.g. Luke: The Long Road"
                  />
                </label>
              </div>
            }
          />
          {status && <p className="auth-status auth-error">{status}</p>}
        </div>
      );
    }

    const alreadyForked = activeSermon ? forkedIds.has(activeSermon.id) : false;
    return (
      <div className={panelClass} style={expand ? undefined : style}>
        <div className="bible-panel-header no-print">
          <BackButton onClick={() => setScreen("detail")} ariaLabel="Back to the church" />
          <h3>{activeSermon?.title || "Sermon outline"}</h3>
        </div>
        <div className="church-sermon-read">
          <p className="comment-status">
            {[activeChurch?.name, activeSermon?.speaker_name, formatServiceDate(activeSermon?.service_date ?? null)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {activeSermon?.scripture_ref && <p className="church-sermon-ref">{activeSermon.scripture_ref}</p>}
          <SermonBodyView body={activeSermon?.body ?? ""} />
          <div className="church-fork-cta">
            <button type="button" disabled={forking} onClick={() => activeSermon && handleFork(activeSermon)}>
              <Icon name="pencil" inline />
              {forking ? "…" : alreadyForked ? "Take notes on this again" : "Take notes on this"}
            </button>
            <p className="comment-status">
              {alreadyForked
                ? "You already have notes on this outline, in My Notes → Sermon Notes. Taking notes again starts a second, separate copy."
                : "This makes your own copy, in My Notes → Sermon Notes. It is yours: the church can't see it, change it, or delete it, and you keep it even if you leave."}
            </p>
          </div>
          {status && <p className="auth-status auth-error">{status}</p>}
        </div>
      </div>
    );
  }

  /* ======================= the church screen ============================= */

  if (screen === "detail" && summary) {
    const pending = joinRequests.length;
    return (
      <div className={panelClass} style={expand ? undefined : style}>
        <div className="bible-panel-header no-print">
          <BackButton
            onClick={() => {
              setScreen("list");
              setActiveChurchId(null);
            }}
            ariaLabel="Back to churches"
          />
          <h3>{activeChurch?.name ?? summary.name}</h3>
        </div>

        <div className="group-detail-tabs">
          <button type="button" className={detailTab === "sermons" ? "active" : ""} onClick={() => setDetailTab("sermons")}>
            Sermons ({sermons.length})
          </button>
          <button type="button" className={detailTab === "members" ? "active" : ""} onClick={() => setDetailTab("members")}>
            Members ({members.length})
            {isChurchAdmin && pending > 0 && <span className="friends-list-item-badge">{pending}</span>}
          </button>
          <button type="button" className={detailTab === "about" ? "active" : ""} onClick={() => setDetailTab("about")}>
            About
          </button>
        </div>

        {status && <p className="auth-status auth-error">{status}</p>}

        {detailTab === "sermons" && (
          <div className="group-members-scroll">
            {isStaff && (
              <button type="button" className="friends-invite-link-button" onClick={() => openSermon(null, "edit")}>
                <Icon name="plus" inline /> New outline
              </button>
            )}
            {sermons.length === 0 && (
              <p className="comment-status">
                {isStaff
                  ? "No outlines yet. Write one and publish it, and your members can take their own notes on it."
                  : "Nothing published yet. When your church posts an outline it will show up here."}
              </p>
            )}
            <ul className="friends-list">
              {sermons.map((s) => (
                <li
                  key={s.id}
                  className="friends-list-item friends-list-item-clickable"
                  onClick={() => openSermon(s, isStaff && s.status === "draft" ? "edit" : "read")}
                >
                  <div className="message-preview">
                    <span className="message-preview-name">
                      {s.title || "Untitled outline"}
                      {s.status === "draft" && <span className="group-role-badge">Draft</span>}
                      {forkedIds.has(s.id) && <span className="group-role-badge">Your notes</span>}
                    </span>
                    <span className="message-preview-text">
                      {[formatServiceDate(s.service_date), s.speaker_name, s.series].filter(Boolean).join(" · ") ||
                        "No date yet"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detailTab === "members" && (
          <div className="group-members-scroll">
            {isChurchAdmin && (
              <>
                <button
                  type="button"
                  className="friends-invite-link-button"
                  onClick={() => {
                    setInviteOpen((o) => !o);
                    setInviteStatus(null);
                  }}
                  aria-expanded={inviteOpen}
                >
                  <Icon name="link" inline /> Invite your congregation
                </button>
                {inviteOpen && activeChurchId && (
                  <div className="church-invite">
                    {/* The QR code is the point of this screen. It goes on the bulletin, on the
                        screen, on a welcome card — it is how two hundred people join in one Sunday
                        morning, and nothing else in this feature does that job. Generated in-app
                        (src/lib/qrCode.ts), drawn black-on-white with a quiet zone regardless of the
                        app's theme, because a QR inverted by dark mode does not scan on most
                        phones and one printed without its margin does not scan at all. */}
                    <div
                      className="church-qr"
                      // Our own generated SVG: a white rect and one path of 1×1 squares, built from
                      // a uuid and this site's own origin. No user-supplied string reaches it.
                      dangerouslySetInnerHTML={{ __html: qrSvg(churchInviteUrl(activeChurchId)) }}
                    />
                    <p className="church-invite-link">{churchInviteUrl(activeChurchId)}</p>
                    <button type="button" onClick={handleCopyInvite}>
                      Copy link
                    </button>
                    {inviteStatus && <p className="comment-status">{inviteStatus}</p>}
                    {/* Said plainly, because it is the one thing an admin must understand about
                        this screen before they print it. */}
                    <p className="comment-status">
                      {activeChurch?.open_join
                        ? "Anyone who scans this or opens the link joins straight away and can read your published outlines. Turn off “anyone with the link can join” under About if you'd rather approve people one by one."
                        : "Anyone who scans this can ask to join. You approve them below before they can read anything."}
                    </p>
                  </div>
                )}

                <form className="friends-add-form" onSubmit={handleAdd}>
                  <input
                    type="text"
                    value={addContact}
                    onChange={(e) => setAddContact(e.target.value)}
                    placeholder="Add by email or phone"
                    required
                  />
                  <button type="submit" disabled={adding || !addContact.trim()}>
                    {adding ? "…" : "Add"}
                  </button>
                </form>
                {addStatus && <p className="comment-status">{addStatus}</p>}
              </>
            )}

            {isChurchAdmin && joinRequests.length > 0 && (
              <div className="friends-section">
                <h4>Waiting to join</h4>
                <ul className="friends-list">
                  {joinRequests.map((r) => (
                    <li key={r.id} className="friends-list-item">
                      <span>{r.display_name}</span>
                      <div className="friends-request-actions">
                        <button type="button" onClick={() => handleRespond(r.id, true)}>
                          Approve
                        </button>
                        <button type="button" className="friends-decline" onClick={() => handleRespond(r.id, false)}>
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="friends-section">
              <h4>Members</h4>
              <ul className="friends-list">
                {members.map((m) => {
                  const isMe = m.user_id === userId;
                  return (
                    <li key={m.user_id} className="friends-list-item group-member-item">
                      <span>
                        {m.display_name}
                        {isMe && " (you)"}
                        {m.role !== "member" && <span className="group-role-badge">{CHURCH_ROLE_LABELS[m.role]}</span>}
                      </span>
                      {isChurchAdmin && !isMe && (
                        <div className="friends-request-actions">
                          <select
                            className="bible-nav-select"
                            aria-label={`Role for ${m.display_name}`}
                            value={m.role}
                            onChange={(e) => handleSetRole(m.user_id, e.target.value as ChurchRole)}
                          >
                            <option value="member">Member</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                          {m.role !== "admin" && (
                            <button type="button" className="friends-decline" onClick={() => handleRemove(m.user_id)}>
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {isChurchAdmin && (
                <p className="comment-status">
                  {CHURCH_ROLE_BLURBS.staff} {CHURCH_ROLE_BLURBS.admin}
                </p>
              )}
            </div>

            <div className="group-danger-zone">
              <button type="button" className="friends-decline" onClick={() => userId && handleRemove(userId)}>
                Leave this church
              </button>
              <p className="comment-status">
                Your sermon notes stay with you. Leaving removes your access to the church's outlines and
                nothing else.
              </p>
            </div>
          </div>
        )}

        {detailTab === "about" && (
          <div className="group-members-scroll">
            {editingInfo && editDraft ? (
              <form className="group-info-edit-form" onSubmit={handleSaveInfo}>
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  placeholder="Church name"
                  required
                  maxLength={120}
                />
                <input
                  type="text"
                  value={editDraft.denomination ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, denomination: e.target.value })}
                  placeholder="Denomination (optional)"
                  maxLength={120}
                />
                <input
                  type="text"
                  value={editDraft.address_line1 ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, address_line1: e.target.value })}
                  placeholder="Street address"
                  maxLength={200}
                />
                <input
                  type="text"
                  value={editDraft.city ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, city: e.target.value })}
                  placeholder="City"
                  maxLength={100}
                />
                <input
                  type="text"
                  value={editDraft.region ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, region: e.target.value })}
                  placeholder="State / region"
                  maxLength={100}
                />
                <input
                  type="text"
                  value={editDraft.postal_code ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, postal_code: e.target.value })}
                  placeholder="Postcode"
                  maxLength={30}
                />
                <input
                  type="text"
                  value={editDraft.website ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, website: e.target.value })}
                  placeholder="Website"
                  maxLength={300}
                />
                <input
                  type="text"
                  value={editDraft.phone ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                  placeholder="Phone"
                  maxLength={40}
                />
                <textarea
                  value={editDraft.service_times ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, service_times: e.target.value })}
                  placeholder="Service times"
                  rows={2}
                  maxLength={600}
                />
                <textarea
                  value={editDraft.about ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, about: e.target.value })}
                  placeholder="About us"
                  rows={4}
                  maxLength={4000}
                />
                <label className="my-notes-public-toggle">
                  <input
                    type="checkbox"
                    checked={editDraft.open_join}
                    onChange={(e) => setEditDraft({ ...editDraft, open_join: e.target.checked })}
                  />
                  <Icon name="link" inline /> Anyone with the invite link can join straight away
                </label>
                <div className="group-info-edit-actions">
                  <button type="submit" disabled={savingInfo || !editDraft.name.trim()}>
                    {savingInfo ? "…" : "Save"}
                  </button>
                  <button type="button" className="friends-decline" onClick={() => setEditingInfo(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="group-info-display">
                {activeChurch?.about && <p className="group-description">{activeChurch.about}</p>}
                {activeChurch?.service_times && (
                  <p className="comment-status">
                    <Icon name="calendar" inline /> {activeChurch.service_times}
                  </p>
                )}
                {(activeChurch?.address_line1 || activeChurch?.city) && (
                  <p className="comment-status">
                    <Icon name="place" inline />{" "}
                    {[activeChurch?.address_line1, activeChurch?.city, activeChurch?.region, activeChurch?.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {activeChurch?.phone && (
                  <p className="comment-status">
                    <Icon name="phone" inline /> {activeChurch.phone}
                  </p>
                )}
                {activeChurch?.website && (
                  <p className="comment-status">
                    <Icon name="globe" inline />{" "}
                    <a href={activeChurch.website} target="_blank" rel="noreferrer noopener">
                      {activeChurch.website}
                    </a>
                  </p>
                )}
                {/* Stated rather than left to be discovered. Stage 1 has no directory and no public
                    page at all, and a church that has just filled in its address deserves to know
                    that nobody outside its own members can see it. */}
                <p className="comment-status">
                  <Icon name="lock" inline /> Only your members can see this page and your outlines.
                  Capstone has no public church directory yet.
                </p>
                {isChurchAdmin && activeChurch && (
                  <button
                    type="button"
                    className="friends-invite-link-button"
                    onClick={() => {
                      setEditDraft(activeChurch);
                      setEditingInfo(true);
                    }}
                  >
                    <Icon name="pencil" inline /> Edit church details
                  </button>
                )}
              </div>
            )}

            {isChurchAdmin && (
              <div className="group-danger-zone">
                <button
                  type="button"
                  className="friends-decline"
                  onClick={() => (confirmingClose ? handleCloseChurch() : setConfirmingClose(true))}
                >
                  {confirmingClose ? "Confirm — close this church" : "Close this church"}
                </button>
                <p className="comment-status">
                  Closing hides the church and its outlines. It is reversible by the Capstone team, and it
                  never touches anybody's own sermon notes.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ======================= register a church ============================= */

  if (screen === "create") {
    return (
      <div className={panelClass} style={expand ? undefined : style}>
        <div className="bible-panel-header no-print">
          <BackButton onClick={() => setScreen("list")} ariaLabel="Back to churches" />
          <h3>Register a Church</h3>
        </div>
        <form className="group-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={newChurch.name}
            onChange={(e) => setNewChurch({ ...newChurch, name: e.target.value })}
            placeholder="Church name"
            required
            maxLength={120}
            autoFocus
          />
          <input
            type="text"
            value={newChurch.denomination}
            onChange={(e) => setNewChurch({ ...newChurch, denomination: e.target.value })}
            placeholder="Denomination (optional)"
            maxLength={120}
          />
          <input
            type="text"
            value={newChurch.city}
            onChange={(e) => setNewChurch({ ...newChurch, city: e.target.value })}
            placeholder="City"
            maxLength={100}
          />
          <input
            type="text"
            value={newChurch.region}
            onChange={(e) => setNewChurch({ ...newChurch, region: e.target.value })}
            placeholder="State / region"
            maxLength={100}
          />
          <input
            type="text"
            value={newChurch.website}
            onChange={(e) => setNewChurch({ ...newChurch, website: e.target.value })}
            placeholder="Website (optional)"
            maxLength={300}
          />
          <input
            type="text"
            value={newChurch.phone}
            onChange={(e) => setNewChurch({ ...newChurch, phone: e.target.value })}
            placeholder="Phone (optional)"
            maxLength={40}
          />
          <textarea
            value={newChurch.serviceTimes}
            onChange={(e) => setNewChurch({ ...newChurch, serviceTimes: e.target.value })}
            placeholder="Service times (optional)"
            rows={2}
            maxLength={600}
          />
          <textarea
            value={newChurch.about}
            onChange={(e) => setNewChurch({ ...newChurch, about: e.target.value })}
            placeholder="About us (optional)"
            rows={4}
            maxLength={4000}
          />
          <p className="friends-invite-hint">
            You'll be this church's first admin. Only your members will be able to see any of this — there
            is no public church directory yet.
          </p>
          {createError && <p className="auth-status auth-error">{createError}</p>}
          <button type="submit" disabled={creating || !newChurch.name.trim()}>
            {creating ? "…" : "Register Church"}
          </button>
        </form>
      </div>
    );
  }

  /* ======================= the list ====================================== */

  return (
    <div className={panelClass} style={expand ? undefined : style}>
      <div className="bible-panel-header no-print">
        <h3>Church</h3>
      </div>
      <ViewSwitcher
        active="church"
        onSelectView={onSelectView}
        friendsBadge={friendsBadgeCount}
        messagesBadge={messagesBadgeCount}
        groupsBadge={groupsBadgeCount}
        showChurch
      />

      {!canUse && (
        <p className="bible-status no-print">
          {session?.user.is_anonymous
            ? "Log in with an account (not just as a guest) to join or register a church."
            : "Log in to join or register a church."}
        </p>
      )}

      {canUse && (
        <>
          <button type="button" className="friends-invite-link-button" onClick={() => setScreen("create")}>
            <Icon name="plus" inline /> Register a Church
          </button>
          {status && <p className="auth-status auth-error">{status}</p>}
          {loading && churches.length === 0 && <p className="bible-status">Loading…</p>}
          {!loading && churches.length === 0 && (
            <p className="comment-status">
              You're not in a church here yet. If yours is already on Capstone, ask them for their invite
              link or scan the QR code on their bulletin — that's how you get in. Otherwise, register it
              above.
            </p>
          )}
          <ul className="friends-list">
            {churches.map((c) => (
              <li
                key={c.church_id}
                className="friends-list-item friends-list-item-clickable"
                onClick={() => openChurch(c.church_id, c.my_role)}
              >
                <div className="message-preview">
                  <span className="message-preview-name">
                    {c.name}
                    {c.my_role !== "member" && <span className="group-role-badge">{CHURCH_ROLE_LABELS[c.my_role]}</span>}
                  </span>
                  <span className="message-preview-text">
                    {c.latest_sermon_title
                      ? `Latest: ${c.latest_sermon_title}`
                      : [c.city, c.region].filter(Boolean).join(", ") || "No outlines yet"}
                  </span>
                </div>
                {c.pending_requests > 0 && <span className="friends-list-item-badge">{c.pending_requests}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
