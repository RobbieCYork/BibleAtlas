import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, setRememberMe, formatJoinDate, type Profile } from "../lib/supabase";
import { useTextSize } from "../lib/textSize";
import ReadingProgressGrid from "./ReadingProgressGrid";
import PostsFeed from "./PostsFeed";
import AvatarCropModal from "./AvatarCropModal";

interface AuthButtonProps {
  session: Session | null;
  /** Bumped by the mobile "More" sheet's "My Profile" entry — pops this menu open straight to the
   * My Profile page. Undefined until first triggered, so mounting doesn't pop the menu open
   * unprompted. Falls back to Settings for guests, who have no profile page to show. */
  openProfileNonce?: number;
  /** Desktop's entry point for Reading Plans, now that the in-reader toolbar chip is gone — mirrors
   * the mobile "More" sheet's "Reading Plans" entry (see MobileTabBar/App/BiblePanel). Closes this
   * menu and hands off to the Bible panel, which isn't rendered inside this dropdown. */
  onOpenReadingPlans?: () => void;
}

type Mode = "login" | "signup" | "reset";

/** Shared with both the logged-in and logged-out dropdown states — text size is a setting, not an
 * account action, so it lives in this menu but isn't gated on being signed in. */
function TextSizeControl() {
  const { scale, increase, decrease, canIncrease, canDecrease } = useTextSize();
  return (
    <div className="auth-settings-section">
      <span className="auth-settings-label">Text Size</span>
      <div className="auth-text-size">
        <button type="button" onClick={decrease} disabled={!canDecrease} aria-label="Decrease text size">
          A⁻
        </button>
        <span className="auth-text-size-value">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={increase} disabled={!canIncrease} aria-label="Increase text size">
          A⁺
        </button>
      </div>
    </div>
  );
}

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

/** The whole "My Profile" page — display name, phone, photo, church, favorite verse, and bio — behind
 * one shared Edit button instead of a separate Save per field (the old layout looked like a form even
 * when you only wanted to glance at your own info). Display name has a uniqueness constraint at the DB
 * level (surfaced via the "23505" error code below, same as the old dedicated control did); phone is
 * digits-only, normalized on save. */
function MyProfileControl({ userId, onDisplayNameSaved }: { userId: string; onDisplayNameSaved: (name: string) => void }) {
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
          <div className="friend-profile-header">
            <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
              {saved.avatarUrl ? <img src={saved.avatarUrl} alt="" /> : "👤"}
            </span>
            <p className="friend-profile-name">{saved.displayName}</p>
          </div>
          {saved.phone && <p className="profile-view-field">📱 {saved.phone}</p>}
          {saved.church && <p className="profile-view-field">{saved.church}</p>}
          {saved.favoriteVerse && (
            <p className="profile-view-field">
              <span aria-hidden="true">📖</span> {saved.favoriteVerse}
            </p>
          )}
          {saved.bio && <p className="profile-view-field">{saved.bio}</p>}
          <button type="button" onClick={() => setEditing(true)}>
            ✏️ Edit
          </button>
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

/** Lets an account choose how long a "mark chapter as read" checkmark sticks before it silently stops
 * counting — e.g. reset every year to re-read the Bible on an annual cycle without clearing old marks
 * by hand. Purely a query-time filter (see chapterReadCutoff) — switching back to Never instantly
 * un-hides everything, nothing was ever deleted. */
function ReadingResetControl({ userId }: { userId: string }) {
  const [reset, setReset] = useState<Profile["chapter_read_reset"]>("never");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("chapter_read_reset")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setReset((data as { chapter_read_reset: Profile["chapter_read_reset"] } | null)?.chapter_read_reset ?? "never");
        setLoaded(true);
      });
  }, [userId]);

  const handleChange = async (value: Profile["chapter_read_reset"]) => {
    setReset(value);
    setSaving(true);
    setSaved(null);
    const { error } = await supabase.from("profiles").update({ chapter_read_reset: value }).eq("id", userId);
    setSaving(false);
    setSaved(error ? "Couldn't save — try again." : "Saved!");
  };

  if (!loaded) return null;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Reset "Read" Marks</span>
      <p className="auth-benefits">
        Automatically stop counting a chapter as read after this long — handy for reading through the Bible on a
        yearly cycle.
      </p>
      <select value={reset} onChange={(e) => handleChange(e.target.value as Profile["chapter_read_reset"])} disabled={saving}>
        <option value="never">Never</option>
        <option value="monthly">1 month after reading</option>
        <option value="yearly">1 year after reading</option>
      </select>
      {saved && <p className="auth-status">{saved}</p>}
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

type MenuView = "menu" | "settings" | "profile";

export default function AuthButton({ session, openProfileNonce, onOpenReadingPlans }: AuthButtonProps) {
  const [open, setOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("menu");

  useEffect(() => {
    if (openProfileNonce === undefined) return;
    setOpen(true);
    setMenuView(session && !session.user.is_anonymous ? "profile" : "settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProfileNonce]);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState<string | null>(null);
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetched once per real session so the avatar/label can show it instead of the raw email.
  useEffect(() => {
    if (!session || session.user.is_anonymous) {
      setSavedDisplayName(null);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setSavedDisplayName((data as { display_name: string | null } | null)?.display_name ?? null);
      });
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const resetForm = () => {
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (err) throw err;
        setInfo("Check your email for a link to reset your password.");
      } else if (mode === "login") {
        setRememberMe(rememberMe);
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setOpen(false);
        setEmail("");
        setPassword("");
      } else {
        const trimmedName = displayName.trim();
        const { data: available } = await supabase.rpc("is_display_name_available", { p_name: trimmedName });
        if (available === false) {
          setError("That display name is taken — try another.");
          return;
        }
        setRememberMe(true);
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: trimmedName } },
        });
        if (err) throw err;
        setInfo("Account created! Check your email to confirm, then log in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      setRememberMe(true);
      const { error: err } = await supabase.auth.signInAnonymously();
      if (err) throw err;
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't continue as guest.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
  };

  if (session) {
    const label = session.user.is_anonymous ? "Guest" : savedDisplayName ?? session.user.email ?? "Account";
    return (
      <div className="auth-button" ref={containerRef}>
        <button
          type="button"
          className="auth-trigger"
          onClick={() => {
            setOpen((o) => !o);
            setMenuView("menu");
          }}
          aria-label="Settings and account"
        >
          <span className="auth-avatar" aria-hidden="true">
            {session.user.is_anonymous ? "👤" : label.charAt(0).toUpperCase()}
          </span>
        </button>
        {open && menuView === "menu" && (
          <div className="auth-dropdown">
            <div className="auth-identity">
              <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
                {session.user.is_anonymous ? "👤" : label.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="auth-current-user">{label}</p>
                {!session.user.is_anonymous && session.user.email && savedDisplayName && (
                  <p className="auth-guest-note">{session.user.email}</p>
                )}
                {session.user.is_anonymous && <p className="auth-guest-note">Browsing as a guest</p>}
              </div>
            </div>
            <div className="auth-settings-divider" />
            {!session.user.is_anonymous && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("profile")}>
                👤 My Profile
              </button>
            )}
            <button type="button" className="auth-menu-item" onClick={() => setMenuView("settings")}>
              ⚙️ Settings
            </button>
            {onOpenReadingPlans && (
              <button
                type="button"
                className="auth-menu-item"
                onClick={() => {
                  setOpen(false);
                  onOpenReadingPlans();
                }}
              >
                🗓️ Reading Plans
              </button>
            )}
            <button type="button" className="auth-menu-item auth-signout" onClick={handleSignOut}>
              Log Out
            </button>
          </div>
        )}
        {open && menuView === "settings" && (
          <div className="auth-dropdown">
            <button type="button" className="auth-back-link" onClick={() => setMenuView("menu")}>
              ← Back
            </button>
            <TextSizeControl />
            {!session.user.is_anonymous && (
              <>
                <div className="auth-settings-divider" />
                <ReadingResetControl userId={session.user.id} />
              </>
            )}
          </div>
        )}
        {open && menuView === "profile" && !session.user.is_anonymous && (
          <div className="auth-dropdown auth-dropdown-wide">
            <button type="button" className="auth-back-link" onClick={() => setMenuView("menu")}>
              ← Back
            </button>
            <MyProfileControl userId={session.user.id} onDisplayNameSaved={setSavedDisplayName} />
            <div className="auth-settings-divider" />
            <div className="auth-settings-section auth-settings-section-stacked">
              <span className="auth-settings-label">My Reading</span>
              <ReadingProgressGrid userId={session.user.id} isOwn />
            </div>
            <div className="auth-settings-divider" />
            <div className="auth-settings-section auth-settings-section-stacked">
              <span className="auth-settings-label">My Posts</span>
              <PostsFeed userId={session.user.id} viewerId={session.user.id} isOwn />
            </div>
            <div className="auth-settings-divider" />
            <DataExportControl userId={session.user.id} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="auth-button" ref={containerRef}>
      <button type="button" className="auth-trigger auth-trigger-loggedout" onClick={() => setOpen((o) => !o)} aria-label="Settings, log in, or sign up">
        <span className="auth-avatar" aria-hidden="true">
          👤
        </span>
        <span className="auth-trigger-label">Log In</span>
      </button>
      {open && (
        <div className="auth-dropdown">
          <TextSizeControl />
          <div className="auth-settings-divider" />
          <p className="auth-benefits">
            Create a free account to sync your notes, highlights, and tags — and pick up right where you left off on any
            device.
          </p>
          {mode !== "reset" && (
            <div className="auth-mode-toggle">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  resetForm();
                }}
              >
                Log In
              </button>
              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => {
                  setMode("signup");
                  resetForm();
                }}
              >
                Sign Up
              </button>
            </div>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setMode("login");
                resetForm();
              }}
            >
              ← Back to Log In
            </button>
          )}
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Display Name (what friends see)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {mode !== "reset" && (
              <div className="auth-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            )}
            {mode === "login" && (
              <div className="auth-form-extras">
                <label className="auth-remember-me">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMeChecked(e.target.checked)} />
                  Remember me
                </label>
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => {
                    setMode("reset");
                    resetForm();
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button type="submit" disabled={loading}>
              {loading ? "…" : mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
            </button>
          </form>
          {error && <p className="auth-status auth-error">{error}</p>}
          {info && <p className="auth-status">{info}</p>}
          <div className="auth-guest-divider">or</div>
          <button type="button" className="auth-guest-button" onClick={handleGuest} disabled={loading}>
            Continue as Guest
          </button>
        </div>
      )}
    </div>
  );
}
