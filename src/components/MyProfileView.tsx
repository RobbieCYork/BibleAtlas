import { useEffect, useRef, useState } from "react";
import { supabase, formatJoinDate, type Profile } from "../lib/supabase";
import ReadingProgressGrid from "./ReadingProgressGrid";
import PostsFeed from "./PostsFeed";
import Newsfeed from "./Newsfeed";
import AvatarCropModal from "./AvatarCropModal";
import LinkedVerseText from "./LinkedVerseText";
import BackButton from "./BackButton";
import AdminConsole from "./AdminConsole";
import { fetchIsAdmin } from "../lib/adminApi";
import { ProfileLinksEditor, ProfileLinksList, type LinkDrafts } from "./ProfileLinks";
import {
  DEFAULT_LINK_VISIBILITY,
  SOCIAL_LINK_CONFIGS,
  fetchProfileLinks,
  normalizeExternalUrl,
  type LinkPlatform,
  type ProfileLink,
} from "../lib/profileLinks";

/** A church website is typed without a scheme half the time ("mychurch.org") — treat that as shorthand
 * for https rather than rejecting it or linking to a relative path on this app's own domain. */
export function ensureUrlProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Every optional "About Me" / Work / Education / Interests field — each independently public or
 * private (see Profile.profile_visibility) and each fine to leave blank. One config drives both
 * MyProfileView's editor and FriendProfileView's read-only display, so a field only needs to be
 * described once. `phone` isn't listed here — it already has its own dedicated input (digits-only,
 * normalized on save) below; it's added to the visibility toggle set separately. */
export interface ProfileFieldConfig {
  key: keyof Pick<
    Profile,
    | "location"
    | "birthday"
    | "relationship_status"
    | "hobbies"
    | "work_experience"
    | "education"
    | "favorite_band"
    | "favorite_song"
    | "favorite_tv_shows"
    | "favorite_movies"
    | "favorite_team_football"
    | "favorite_team_basketball"
    | "favorite_team_baseball"
    | "favorite_team_hockey"
    | "favorite_team_soccer"
  >;
  label: string;
  icon: string;
  section: "about" | "work" | "education" | "interests";
  type: "text" | "textarea" | "date";
  placeholder?: string;
}

export const PROFILE_FIELD_CONFIGS: ProfileFieldConfig[] = [
  { key: "location", label: "Where I live", icon: "📍", section: "about", type: "text", placeholder: "City, State" },
  { key: "birthday", label: "Birthday", icon: "🎂", section: "about", type: "date" },
  { key: "relationship_status", label: "Relationship status", icon: "💍", section: "about", type: "text", placeholder: "e.g. Married, Single" },
  { key: "hobbies", label: "Hobbies", icon: "🎨", section: "about", type: "textarea", placeholder: "Hiking, cooking, reading…" },
  { key: "work_experience", label: "Work experience", icon: "💼", section: "work", type: "textarea", placeholder: "Where you've worked…" },
  { key: "education", label: "Education", icon: "🎓", section: "education", type: "textarea", placeholder: "High school, college…" },
  { key: "favorite_band", label: "Favorite band", icon: "🎵", section: "interests", type: "text" },
  { key: "favorite_song", label: "Favorite song", icon: "🎧", section: "interests", type: "text" },
  { key: "favorite_tv_shows", label: "Favorite TV shows", icon: "📺", section: "interests", type: "text" },
  { key: "favorite_movies", label: "Favorite movies", icon: "🎬", section: "interests", type: "text" },
  { key: "favorite_team_football", label: "Favorite football team", icon: "🏈", section: "interests", type: "text" },
  { key: "favorite_team_basketball", label: "Favorite basketball team", icon: "🏀", section: "interests", type: "text" },
  { key: "favorite_team_baseball", label: "Favorite baseball team", icon: "⚾", section: "interests", type: "text" },
  { key: "favorite_team_hockey", label: "Favorite hockey team", icon: "🏒", section: "interests", type: "text" },
  { key: "favorite_team_soccer", label: "Favorite soccer team", icon: "⚽", section: "interests", type: "text" },
];

export const PROFILE_SECTION_LABELS: Record<ProfileFieldConfig["section"], string> = {
  about: "About Me",
  work: "Work",
  education: "Education",
  interests: "Interests",
};

interface ProfileFields {
  displayName: string;
  phone: string;
  avatarUrl: string | null;
  church: string;
  churchWebsite: string;
  favoriteVerse: string;
  bio: string;
  /** Keyed by ProfileFieldConfig.key. */
  extra: Record<string, string>;
  /** Keyed by ProfileFieldConfig.key, plus "phone" — true means visible on FriendProfileView. */
  visibility: Record<string, boolean>;
  discoverableByName: boolean;
}

const EMPTY_PROFILE_FIELDS: ProfileFields = {
  displayName: "",
  phone: "",
  avatarUrl: null,
  church: "",
  churchWebsite: "",
  favoriteVerse: "",
  bio: "",
  extra: {},
  visibility: {},
  discoverableByName: false,
};

/** The whole "My Profile" page — display name, photo, church, favorite verse, and bio — behind
 * one shared Edit button instead of a separate Save per field (the old layout looked like a form even
 * when you only wanted to glance at your own info). Display name has a uniqueness constraint at the DB
 * level (surfaced via the "23505" error code below, same as the old dedicated control did); phone is
 * digits-only, normalized on save, but — unlike every other field — never rendered back in this view
 * (see the profile-view block below): it's only used so friends can find this account by phone (see
 * FriendsPanel's add-by-phone lookup), not something this account needs to see about itself. */
function MyProfileControl({
  userId,
  onDisplayNameSaved,
  onGoToVerse,
}: {
  userId: string;
  onDisplayNameSaved: (name: string) => void;
  onGoToVerse: (reference: string) => void;
}) {
  const [saved, setSavedFields] = useState<ProfileFields>(EMPTY_PROFILE_FIELDS);
  const [draft, setDraft] = useState<ProfileFields>(EMPTY_PROFILE_FIELDS);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Social links live in their own table (sql/017_profile_links.sql) rather than as more `profiles`
  // columns, because their per-link visibility has to be enforced by RLS and RLS is row-level — a
  // hidden *column* would still be shipped to whoever may read the row. So they load and save on
  // their own path, but ride the same one Edit/Save/Cancel as the rest of this page.
  const [savedLinks, setSavedLinks] = useState<ProfileLink[]>([]);
  const [linkDrafts, setLinkDrafts] = useState<LinkDrafts>({});
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});

  const draftsFromLinks = (links: ProfileLink[]): LinkDrafts => {
    const drafts: LinkDrafts = {};
    SOCIAL_LINK_CONFIGS.forEach((c) => {
      const existing = links.find((l) => l.platform === c.platform);
      drafts[c.platform] = { url: existing?.url ?? "", visibility: existing?.visibility ?? DEFAULT_LINK_VISIBILITY };
    });
    return drafts;
  };

  const loadLinks = () =>
    fetchProfileLinks(userId).then((links) => {
      setSavedLinks(links);
      setLinkDrafts(draftsFromLinks(links));
    });

  const fetchProfile = () =>
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        const row = data as Profile | null;
        const extra: Record<string, string> = {};
        PROFILE_FIELD_CONFIGS.forEach((f) => {
          extra[f.key] = row?.[f.key] ?? "";
        });
        const fields: ProfileFields = {
          displayName: row?.display_name ?? "",
          phone: row?.phone ?? "",
          avatarUrl: row?.avatar_url ?? null,
          church: row?.church ?? "",
          churchWebsite: row?.church_website ?? "",
          favoriteVerse: row?.favorite_verse ?? "",
          bio: row?.bio ?? "",
          extra,
          visibility: row?.profile_visibility ?? {},
          discoverableByName: row?.discoverable_by_name ?? false,
        };
        setSavedFields(fields);
        setDraft(fields);
        setJoinedAt(row?.created_at ?? null);
        setLoaded(true);
      });

  useEffect(() => {
    fetchProfile();
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // The verse's own text, shown under the reference link — fetched the same way App's daily-verse
  // card fetches its passage text, since favorite_verse is free text and only sometimes a valid
  // "Book Chapter:Verse" the API can resolve (see the Profile.favorite_verse doc comment).
  const [favoriteVerseText, setFavoriteVerseText] = useState<string | null>(null);
  useEffect(() => {
    const ref = saved.favoriteVerse.trim();
    setFavoriteVerseText(null);
    if (!ref) return;
    let cancelled = false;
    fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=web`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.text) setFavoriteVerseText(data.text.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [saved.favoriteVerse]);

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets picking the same file again re-fire onChange
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropped = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploading(true);
    setStatus(null);
    const path = `${userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) {
      setUploading(false);
      setStatus("Couldn't upload photo — try again.");
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    setSavedFields((f) => ({ ...f, avatarUrl: publicUrl }));
    setDraft((f) => ({ ...f, avatarUrl: publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    const trimmedName = draft.displayName.trim();
    if (!trimmedName) {
      setStatus("Display name can't be empty.");
      return;
    }
    // Validate every link before touching the database, so one bad URL doesn't leave the profile
    // half-saved. `javascript:` and friends are refused here, again by the CHECK constraint on
    // profile_links.url, and a third time by safeHref() at render — a link that reaches another
    // person's screen has been through all three.
    const nextErrors: Record<string, string> = {};
    const upserts: { user_id: string; platform: LinkPlatform; url: string; visibility: string }[] = [];
    const deletes: LinkPlatform[] = [];
    SOCIAL_LINK_CONFIGS.forEach((c) => {
      const entry = linkDrafts[c.platform];
      const raw = entry?.url.trim() ?? "";
      if (!raw) {
        if (savedLinks.some((l) => l.platform === c.platform)) deletes.push(c.platform);
        return;
      }
      const normalized = normalizeExternalUrl(raw);
      if (!normalized) {
        nextErrors[c.platform] = "That doesn't look like a web address — use something like instagram.com/yourname.";
        return;
      }
      upserts.push({
        user_id: userId,
        platform: c.platform,
        url: normalized,
        visibility: entry?.visibility ?? DEFAULT_LINK_VISIBILITY,
      });
    });
    setLinkErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("Check the social links marked below.");
      return;
    }

    setSaving(true);
    setStatus(null);
    const normalizedPhone = draft.phone.replace(/\D/g, "");
    const extraUpdates: Record<string, string | null> = {};
    PROFILE_FIELD_CONFIGS.forEach((f) => {
      extraUpdates[f.key] = draft.extra[f.key]?.trim() || null;
    });
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
        phone: normalizedPhone || null,
        church: draft.church.trim() || null,
        church_website: draft.churchWebsite.trim() || null,
        favorite_verse: draft.favoriteVerse.trim() || null,
        bio: draft.bio.trim() || null,
        profile_visibility: draft.visibility,
        discoverable_by_name: draft.discoverableByName,
        ...extraUpdates,
      })
      .eq("id", userId);
    if (error) {
      setSaving(false);
      setStatus(error.code === "23505" ? "That display name is taken — try another." : "Couldn't save — try again.");
      return;
    }

    if (deletes.length > 0) {
      await supabase.from("profile_links").delete().eq("user_id", userId).in("platform", deletes);
    }
    if (upserts.length > 0) {
      const { error: linkError } = await supabase.from("profile_links").upsert(upserts, { onConflict: "user_id,platform" });
      if (linkError) {
        setSaving(false);
        setStatus("Couldn't save your social links — try again.");
        return;
      }
    }
    await loadLinks();

    setSaving(false);
    const nextSaved = { ...draft, displayName: trimmedName, phone: normalizedPhone };
    setSavedFields(nextSaved);
    setDraft(nextSaved);
    onDisplayNameSaved(trimmedName);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(saved);
    setLinkDrafts(draftsFromLinks(savedLinks));
    setLinkErrors({});
    setStatus(null);
    setEditing(false);
  };

  if (!loaded) return null;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <div className="profile-page-header">
        <span className="auth-settings-label">My Profile</span>
        {joinedAt && <span className="profile-joined-inline">(Joined {formatJoinDate(joinedAt)})</span>}
      </div>

      {!editing ? (
        <div className="profile-view">
          <div className="friend-profile-header myprofile-name-row">
            <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
              {saved.avatarUrl ? <img src={saved.avatarUrl} alt="" /> : "👤"}
            </span>
            <p className="friend-profile-name myprofile-name-grow">{saved.displayName}</p>
            <button type="button" className="myprofile-edit-btn" onClick={() => setEditing(true)}>
              ✏️ Edit
            </button>
          </div>
          <button
            type="button"
            className="profile-view-toggle"
            onClick={() => setAboutOpen((o) => !o)}
            aria-expanded={aboutOpen}
          >
            {aboutOpen ? "▾ Hide" : "▸ Show"} About Me
          </button>

          {aboutOpen && (
            <>
              {saved.bio && <p className="profile-view-field">{saved.bio}</p>}
              {saved.phone && (
                <p className="profile-view-field">
                  <span aria-hidden="true">📱</span> Phone: {saved.phone}{" "}
                  <span className="profile-field-visibility-note">{saved.visibility.phone ? "🌐" : "🔒"}</span>
                </p>
              )}

              {(["about", "work", "education", "interests"] as const).map((section) => {
                const fields = PROFILE_FIELD_CONFIGS.filter((f) => f.section === section && saved.extra[f.key]);
                if (fields.length === 0) return null;
                return (
                  <div key={section} className="profile-view-section">
                    <h4 className="profile-view-section-heading">{PROFILE_SECTION_LABELS[section]}</h4>
                    {fields.map((f) => (
                      <p key={f.key} className="profile-view-field">
                        <span aria-hidden="true">{f.icon}</span> {f.label}: {saved.extra[f.key]}{" "}
                        <span className="profile-field-visibility-note">{saved.visibility[f.key] ? "🌐" : "🔒"}</span>
                      </p>
                    ))}
                  </div>
                );
              })}
            </>
          )}
          {saved.church && (
            <p className="profile-view-field">
              <span aria-hidden="true">⛪</span> Church:{" "}
              {saved.churchWebsite ? (
                <a href={ensureUrlProtocol(saved.churchWebsite)} target="_blank" rel="noopener noreferrer">
                  {saved.church}
                </a>
              ) : (
                saved.church
              )}
            </p>
          )}
          {saved.favoriteVerse && (
            <div className="profile-view-field profile-favorite-verse">
              <span aria-hidden="true">📖</span> Favorite verse:{" "}
              <LinkedVerseText
                text={saved.favoriteVerse}
                onSelectLocation={() => {}}
                onSelectPoi={() => {}}
                onSelectVerse={onGoToVerse}
              />
              {favoriteVerseText && <p className="verse-popup-quoted">"{favoriteVerseText}"</p>}
            </div>
          )}
          {/* The owner always sees every link they've added, private ones included — the badge beside
           * each says who else can. */}
          {savedLinks.length > 0 && (
            <div className="profile-view-section">
              <h4 className="profile-view-section-heading">Social Links</h4>
              <ProfileLinksList links={savedLinks} showVisibility />
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="auth-avatar-upload-row">
            <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
              {draft.avatarUrl ? <img src={draft.avatarUrl} alt="" /> : "👤"}
            </span>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Change Photo"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoSelected} />
          </div>
          <input
            type="text"
            value={draft.displayName}
            onChange={(e) => setDraft((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="What friends see"
          />
          <label className="my-notes-public-toggle">
            <input
              type="checkbox"
              checked={draft.discoverableByName}
              onChange={(e) => setDraft((f) => ({ ...f, discoverableByName: e.target.checked }))}
            />
            🔍 Let people find me by searching my name (email and phone always work)
          </label>
          <div className="profile-edit-field-row">
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone number (optional)"
            />
            <label className="profile-field-visibility-toggle" title="Show on your profile to friends">
              <input
                type="checkbox"
                checked={!!draft.visibility.phone}
                onChange={(e) => setDraft((f) => ({ ...f, visibility: { ...f.visibility, phone: e.target.checked } }))}
              />
              🌐
            </label>
          </div>
          <input
            type="text"
            value={draft.church}
            onChange={(e) => setDraft((f) => ({ ...f, church: e.target.value }))}
            placeholder="Church you attend (optional)"
          />
          {draft.church.trim() && (
            <>
              <p className="profile-field-hint">🌐 Show your church some love! Enter your church's website here and we'll link to it!</p>
              <input
                type="text"
                value={draft.churchWebsite}
                onChange={(e) => setDraft((f) => ({ ...f, churchWebsite: e.target.value }))}
                placeholder="Church website (optional)"
              />
            </>
          )}
          <input
            type="text"
            value={draft.favoriteVerse}
            onChange={(e) => setDraft((f) => ({ ...f, favoriteVerse: e.target.value }))}
            placeholder="Favorite Bible verse (optional)"
          />
          <textarea
            value={draft.bio}
            onChange={(e) => setDraft((f) => ({ ...f, bio: e.target.value }))}
            placeholder="A little about you (optional)"
            rows={3}
          />

          {(["about", "work", "education", "interests"] as const).map((section) => (
            <div key={section} className="profile-edit-section">
              <h4 className="profile-edit-section-heading">{PROFILE_SECTION_LABELS[section]}</h4>
              {PROFILE_FIELD_CONFIGS.filter((f) => f.section === section).map((f) => (
                <div key={f.key} className="profile-edit-field-row">
                  {f.type === "textarea" ? (
                    <textarea
                      value={draft.extra[f.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, extra: { ...d.extra, [f.key]: e.target.value } }))}
                      placeholder={`${f.label} (optional)`}
                      rows={2}
                    />
                  ) : (
                    <input
                      type={f.type}
                      value={draft.extra[f.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, extra: { ...d.extra, [f.key]: e.target.value } }))}
                      placeholder={f.type === "date" ? undefined : `${f.label} (optional)`}
                    />
                  )}
                  <label className="profile-field-visibility-toggle" title="Show on your profile to friends">
                    <input
                      type="checkbox"
                      checked={!!draft.visibility[f.key]}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, visibility: { ...d.visibility, [f.key]: e.target.checked } }))
                      }
                    />
                    🌐
                  </label>
                </div>
              ))}
            </div>
          ))}

          <ProfileLinksEditor
            drafts={linkDrafts}
            errors={linkErrors}
            onChange={(platform, next) => {
              setLinkDrafts((d) => ({ ...d, [platform]: next }));
              setLinkErrors((e) => {
                if (!e[platform]) return e;
                const { [platform]: _removed, ...rest } = e;
                return rest;
              });
            }}
          />

          <div className="profile-edit-actions">
            <button type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "…" : "Save"}
            </button>
          </div>
        </>
      )}
      {status && <p className="auth-status auth-error">{status}</p>}

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onCropped={handleCropped}
        />
      )}
    </div>
  );
}

/** Tables that hold this account's own content — every row is scoped by user_id (profiles by its
 * primary key `id` instead). Friend requests/messages/groups are deliberately left out: those rows
 * belong jointly to more than one account, so they don't fit a single-user backup. */
const BACKUP_TABLES = ["notes", "highlights", "tags", "verse_tags", "sermon_notes", "reading_progress"] as const;

/** Lets an account download everything it owns — profile fields plus every note/highlight/tag/sermon
 * note/reading position — as a JSON file, so a person's own Bible-study content can never be lost even
 * if something goes wrong on the server side. Not a full account restore tool, just a personal copy. */
function DataExportControl({ userId }: { userId: string }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const [profileRes, ...tableResults] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        ...BACKUP_TABLES.map((table) => supabase.from(table).select("*").eq("user_id", userId)),
      ]);
      if (profileRes.error) throw profileRes.error;
      const backup: Record<string, unknown> = { exported_at: new Date().toISOString(), profile: profileRes.data };
      BACKUP_TABLES.forEach((table, i) => {
        const res = tableResults[i];
        if (res.error) throw res.error;
        backup[table] = res.data;
      });
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `biblical-atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export — try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Back Up My Data</span>
      <p className="auth-benefits">
        Download your profile, notes, highlights, tags, sermon notes, and reading position as a JSON file you keep
        yourself.
      </p>
      <button type="button" onClick={handleExport} disabled={exporting}>
        {exporting ? "Preparing…" : "Download Backup"}
      </button>
      {error && <p className="auth-status auth-error">{error}</p>}
    </div>
  );
}

interface MyProfileViewProps {
  userId: string;
  onDisplayNameSaved: (name: string) => void;
  /** Returns to wherever the reader was before opening My Profile — same "close a full-screen mode"
   * shape as TimelineView's onClose. */
  onClose: () => void;
  /** Jumps the Bible reader to a reference (used by the favorite-verse link) — the view closes itself
   * first so the reader actually sees the passage land, same as Timeline mode's exitTimelineThen. */
  onGoToVerse: (reference: string) => void;
  /** Opens the Friends panel to a specific list (Friends/Messages/Groups), closing My Profile first —
   * same "leave this full-screen mode to enter another surface" shape as onGoToVerse above. */
  onOpenFriends: (view: "friends" | "messages" | "groups") => void;
}

/** Full-screen "My Profile" mode — same top-level takeover pattern as TimelineView (a boolean in App
 * renders this over the whole app-body, with its own header and Back button) instead of the small
 * anchored dropdown this used to be. Reachable from the desktop account menu's "My Profile" and the
 * mobile "More" sheet's entry of the same name; both now open this directly rather than popping the
 * account flyout to an internal "profile" view. */
export default function MyProfileView({ userId, onDisplayNameSaved, onClose, onGoToVerse, onOpenFriends }: MyProfileViewProps) {
  const [postsTab, setPostsTab] = useState<"newsfeed" | "mine">("newsfeed");
  // Whether to DRAW the Admin Console section. Not the access control: every query the console makes
  // is refused server-side for a non-admin (see sql/019 — each admin_* function raises before doing
  // any work, and analytics_events' RLS grants SELECT to admins only). A client that flipped this
  // boolean would get a console full of "not authorized".
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchIsAdmin(userId).then((ok) => {
      if (!cancelled) setIsAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return (
    <section className="myprofile-root" aria-label="My Profile">
      <header className="myprofile-header">
        <BackButton onClick={onClose} ariaLabel="Close My Profile" />
        <h2 className="myprofile-title">My Profile</h2>
      </header>
      <div className="myprofile-body">
        <div className="myprofile-body-inner">
          <div className="auth-settings-section auth-settings-section-stacked">
            <div className="myprofile-social-links">
              <button type="button" onClick={() => onOpenFriends("friends")}>
                👥 Friends
              </button>
              <button type="button" onClick={() => onOpenFriends("groups")}>
                👪 Groups
              </button>
              <button type="button" onClick={() => onOpenFriends("messages")}>
                💬 Messages
              </button>
            </div>
          </div>
          <div className="auth-settings-divider" />
          <MyProfileControl userId={userId} onDisplayNameSaved={onDisplayNameSaved} onGoToVerse={onGoToVerse} />
          <div className="auth-settings-divider" />
          <div className="auth-settings-section auth-settings-section-stacked">
            <span className="auth-settings-label">My Reading</span>
            <ReadingProgressGrid userId={userId} isOwn />
          </div>
          <div className="auth-settings-divider" />
          <div className="auth-settings-section auth-settings-section-stacked">
            <div className="myprofile-posts-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={postsTab === "newsfeed"}
                className={`myprofile-posts-tab ${postsTab === "newsfeed" ? "myprofile-posts-tab-active" : ""}`}
                onClick={() => setPostsTab("newsfeed")}
              >
                Newsfeed
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={postsTab === "mine"}
                className={`myprofile-posts-tab ${postsTab === "mine" ? "myprofile-posts-tab-active" : ""}`}
                onClick={() => setPostsTab("mine")}
              >
                My Posts
              </button>
            </div>
            {postsTab === "newsfeed" ? (
              <Newsfeed userId={userId} onGoToVerse={onGoToVerse} />
            ) : (
              <PostsFeed userId={userId} viewerId={userId} isOwn />
            )}
          </div>
          <div className="auth-settings-divider" />
          <DataExportControl userId={userId} />
          {isAdmin && (
            <>
              <div className="auth-settings-divider" />
              <div className="auth-settings-section auth-settings-section-stacked">
                <span className="auth-settings-label">Admin Console</span>
                <p className="auth-benefits">
                  Usage, engagement, and moderation for the whole site. Only accounts listed in <code>admin_users</code>{" "}
                  can load any of it — the database refuses the queries for everyone else, not just this button.
                </p>
                <button type="button" onClick={() => setAdminOpen((v) => !v)}>
                  {adminOpen ? "Hide Admin Console" : "Open Admin Console"}
                </button>
                {adminOpen && <AdminConsole />}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
