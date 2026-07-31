import { useEffect, useState } from "react";
import { supabase, displayFor, formatJoinDate, type Profile } from "../lib/supabase";
import ReadingProgressGrid from "./ReadingProgressGrid";
import PostsFeed from "./PostsFeed";
import BackButton from "./BackButton";
import { PROFILE_FIELD_CONFIGS, PROFILE_SECTION_LABELS, ensureUrlProtocol } from "./MyProfileView";

interface FriendProfileViewProps {
  friendId: string;
  /** The signed-in account's own id — needed to post a comment as someone. */
  viewerId?: string;
  onBack: () => void;
  onMessage: () => void;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
}

/** A friend's read-only profile page — photo/church/bio/favorite verse, reading progress, and their
 * public notes as posts with comments. Reachable from the Friends list ("View Profile"), separate
 * from jumping straight into Messages. */
export default function FriendProfileView({ friendId, viewerId, onBack, onMessage, expand, style, hidden }: FriendProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", friendId)
      .single()
      .then(({ data }) => {
        setProfile(data as Profile | null);
        setLoaded(true);
      });
  }, [friendId]);

  return (
    <div className={`friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
      <div className="bible-panel-header no-print">
        <BackButton onClick={onBack} ariaLabel="Back to friends list" />
        <h3>{profile ? displayFor(profile) : "Profile"}</h3>
      </div>

      {!loaded && <p className="comment-status">Loading…</p>}

      {loaded && profile && (
        <div className="friend-profile-body">
          <div className="friend-profile-header">
            <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : displayFor(profile).charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="friend-profile-name">{displayFor(profile)}</p>
              {profile.church && (
                <p className="friend-profile-church">
                  {profile.church_website ? (
                    <a href={ensureUrlProtocol(profile.church_website)} target="_blank" rel="noopener noreferrer">
                      {profile.church}
                    </a>
                  ) : (
                    profile.church
                  )}
                </p>
              )}
              <p className="friend-profile-joined">Joined {formatJoinDate(profile.created_at)}</p>
            </div>
          </div>
          {profile.favorite_verse && (
            <p className="friend-profile-verse">
              <span aria-hidden="true">📖</span> Favorite verse: {profile.favorite_verse}
            </p>
          )}
          {profile.bio && <p className="friend-profile-bio">{profile.bio}</p>}
          {profile.phone && profile.profile_visibility.phone && (
            <p className="profile-view-field">
              <span aria-hidden="true">📱</span> Phone: {profile.phone}
            </p>
          )}

          {(["about", "work", "education", "interests"] as const).map((section) => {
            const fields = PROFILE_FIELD_CONFIGS.filter(
              (f) => f.section === section && profile[f.key] && profile.profile_visibility[f.key]
            );
            if (fields.length === 0) return null;
            return (
              <div key={section} className="profile-view-section">
                <h4 className="profile-view-section-heading">{PROFILE_SECTION_LABELS[section]}</h4>
                {fields.map((f) => (
                  <p key={f.key} className="profile-view-field">
                    <span aria-hidden="true">{f.icon}</span> {f.label}: {profile[f.key]}
                  </p>
                ))}
              </div>
            );
          })}

          <button type="button" className="friend-profile-message-button" onClick={onMessage}>
            💬 Message
          </button>

          <div className="friend-profile-section">
            <h4>Reading Progress</h4>
            <ReadingProgressGrid userId={friendId} displayName={displayFor(profile)} />
          </div>

          <div className="friend-profile-section">
            <h4>Posts</h4>
            <PostsFeed userId={friendId} viewerId={viewerId} />
          </div>
        </div>
      )}
    </div>
  );
}
