import { useEffect, useRef, useState } from "react";
import { supabase, formatJoinDate } from "../lib/supabase";
import ReadingProgressGrid from "./ReadingProgressGrid";
import PostsFeed from "./PostsFeed";
import Newsfeed from "./Newsfeed";
import AvatarCropModal from "./AvatarCropModal";
import LinkedVerseText from "./LinkedVerseText";
import BackButton from "./BackButton";

interface ProfileFields {
  displayName: string;
  phone: string;
  avatarUrl: string | null;
  church: string;
  favoriteVerse: string;
  bio: string;
}

const EMPTY_PROFILE_FIELDS: ProfileFields = {
  displayName: "",
  phone: "",
  avatarUrl: null,
  church: "",
  favoriteVerse: "",
  bio: "",
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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchProfile = () =>
    supabase
      .from("profiles")
      .select("display_name, phone, avatar_url, church, favorite_verse, bio, created_at")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        const row = data as
          | {
              display_name: string | null;
              phone: string | null;
              avatar_url: string | null;
              church: string | null;
              favorite_verse: string | null;
              bio: string | null;
              created_at: string;
            }
          | null;
        const fields: ProfileFields = {
          displayName: row?.display_name ?? "",
          phone: row?.phone ?? "",
          avatarUrl: row?.avatar_url ?? null,
          church: row?.church ?? "",
          favoriteVerse: row?.favorite_verse ?? "",
          bio: row?.bio ?? "",
        };
        setSavedFields(fields);
        setDraft(fields);
        setJoinedAt(row?.created_at ?? null);
        setLoaded(true);
      });

  useEffect(() => {
    fetchProfile();
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
    setSaving(true);
    setStatus(null);
    const normalizedPhone = draft.phone.replace(/\D/g, "");
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
        phone: normalizedPhone || null,
        church: draft.church.trim() || null,
        favorite_verse: draft.favoriteVerse.trim() || null,
        bio: draft.bio.trim() || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setStatus(error.code === "23505" ? "That display name is taken — try another." : "Couldn't save — try again.");
      return;
    }
    const nextSaved = { ...draft, displayName: trimmedName, phone: normalizedPhone };
    setSavedFields(nextSaved);
    setDraft(nextSaved);
    onDisplayNameSaved(trimmedName);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(saved);
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
          {saved.church && (
            <p className="profile-view-field">
              <span aria-hidden="true">⛪</span> Church: {saved.church}
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
          {saved.bio && <p className="profile-view-field">{saved.bio}</p>}
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
          <input
            type="tel"
            value={draft.phone}
            onChange={(e) => setDraft((f) => ({ ...f, phone: e.target.value }))}
            placeholder="So friends can find you by phone (optional)"
          />
          <input
            type="text"
            value={draft.church}
            onChange={(e) => setDraft((f) => ({ ...f, church: e.target.value }))}
            placeholder="Church you attend (optional)"
          />
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
        </div>
      </div>
    </section>
  );
}
