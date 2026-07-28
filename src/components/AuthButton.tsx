import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, setRememberMe, formatJoinDate, type Profile } from "../lib/supabase";
import { useTextSize } from "../lib/textSize";
import ReadingProgressGrid from "./ReadingProgressGrid";

interface AuthButtonProps {
  session: Session | null;
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

/** Optional — lets friends find this account by phone instead of email. Only shown for real
 * (non-anonymous) accounts, since guests don't have a profile row to attach it to. */
function PhoneNumberControl({ userId }: { userId: string }) {
  const [phone, setPhone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setPhone((data as { phone: string | null } | null)?.phone ?? "");
        setLoaded(true);
      });
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(null);
    const normalized = phone.replace(/\D/g, "");
    const { error } = await supabase.from("profiles").update({ phone: normalized || null }).eq("id", userId);
    setSaving(false);
    setSaved(error ? "Couldn't save — try again." : "Saved!");
    if (!error) setPhone(normalized);
  };

  if (!loaded) return null;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Phone Number</span>
      <div className="auth-phone-row">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="So friends can find you by phone"
        />
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "…" : "Save"}
        </button>
      </div>
      {saved && <p className="auth-status">{saved}</p>}
    </div>
  );
}

/** Same pattern as PhoneNumberControl — lets an account change its display name later. Separate from
 * the required-at-signup flow and the app-root gate that catches accounts created before this field
 * existed (see DisplayNameGate). */
function DisplayNameControl({ userId, onSaved }: { userId: string; onSaved: (name: string) => void }) {
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setName((data as { display_name: string | null } | null)?.display_name ?? "");
        setLoaded(true);
      });
  }, [userId]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaved(null);
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
    setSaving(false);
    if (error) {
      setSaved(error.code === "23505" ? "That name is taken — try another." : "Couldn't save — try again.");
      return;
    }
    setSaved("Saved!");
    onSaved(trimmed);
  };

  if (!loaded) return null;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Display Name</span>
      <div className="auth-phone-row">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="What friends see" />
        <button type="button" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "…" : "Save"}
        </button>
      </div>
      {saved && <p className="auth-status">{saved}</p>}
    </div>
  );
}

/** The optional "profile page" fields shown when a friend clicks your name — photo, church,
 * favorite verse, and a short bio. Grouped into one control (one fetch, one save) since they're all
 * part of the same picture, unlike Display Name/Phone which have their own identity-lookup purpose. */
function ProfileDetailsControl({ userId }: { userId: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [church, setChurch] = useState("");
  const [favoriteVerse, setFavoriteVerse] = useState("");
  const [bio, setBio] = useState("");
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("avatar_url, church, favorite_verse, bio, created_at")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        const row = data as
          | { avatar_url: string | null; church: string | null; favorite_verse: string | null; bio: string | null; created_at: string }
          | null;
        setAvatarUrl(row?.avatar_url ?? null);
        setChurch(row?.church ?? "");
        setFavoriteVerse(row?.favorite_verse ?? "");
        setBio(row?.bio ?? "");
        setJoinedAt(row?.created_at ?? null);
        setLoaded(true);
      });
  }, [userId]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSaved(null);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      setSaved("Couldn't upload photo — try again.");
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    setAvatarUrl(publicUrl);
    setUploading(false);
    setSaved("Saved!");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(null);
    const { error } = await supabase
      .from("profiles")
      .update({ church: church.trim() || null, favorite_verse: favoriteVerse.trim() || null, bio: bio.trim() || null })
      .eq("id", userId);
    setSaving(false);
    setSaved(error ? "Couldn't save — try again." : "Saved!");
  };

  if (!loaded) return null;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">My Profile</span>
      <div className="auth-avatar-upload-row">
        <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : "👤"}
        </span>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Change Photo"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
      </div>
      {joinedAt && <p className="friend-profile-joined">Joined {formatJoinDate(joinedAt)}</p>}
      <input type="text" value={church} onChange={(e) => setChurch(e.target.value)} placeholder="Church you attend (optional)" />
      <input
        type="text"
        value={favoriteVerse}
        onChange={(e) => setFavoriteVerse(e.target.value)}
        placeholder="Favorite Bible verse (optional)"
      />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A little about you (optional)" rows={3} />
      <button type="button" onClick={handleSave} disabled={saving}>
        {saving ? "…" : "Save"}
      </button>
      {saved && <p className="auth-status">{saved}</p>}
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

type MenuView = "menu" | "settings";

export default function AuthButton({ session }: AuthButtonProps) {
  const [open, setOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("menu");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            <button type="button" className="auth-menu-item" onClick={() => setMenuView("settings")}>
              ⚙️ Settings
            </button>
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
                <DisplayNameControl userId={session.user.id} onSaved={setSavedDisplayName} />
                <div className="auth-settings-divider" />
                <PhoneNumberControl userId={session.user.id} />
                <div className="auth-settings-divider" />
                <ProfileDetailsControl userId={session.user.id} />
                <div className="auth-settings-divider" />
                <div className="auth-settings-section auth-settings-section-stacked">
                  <span className="auth-settings-label">My Reading</span>
                  <ReadingProgressGrid userId={session.user.id} isOwn />
                </div>
                <div className="auth-settings-divider" />
                <ReadingResetControl userId={session.user.id} />
                <div className="auth-settings-divider" />
                <DataExportControl userId={session.user.id} />
              </>
            )}
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
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
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
