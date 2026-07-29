import { useEffect, useState } from "react";
import { supabase, displayFor, formatJoinDate, type Profile } from "../lib/supabase";
import ReadingProgressGrid from "./ReadingProgressGrid";
import PostsFeed from "./PostsFeed";

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
        <button type="button" className="friends-back" onClick={onBack} aria-label="Back to friends list">
          ← Back
        </button>
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
              {profile.church && <p className="friend-profile-church">{profile.church}</p>}
              <p className="friend-profile-joined">Joined {formatJoinDate(profile.created_at)}</p>
            </div>
          </div>
          {profile.favorite_verse && (
            <p className="friend-profile-verse">
              <span aria-hidden="true">📖</span> Favorite verse: {profile.favorite_verse}
            </p>
          )}
          {profile.bio && <p className="friend-profile-bio">{profile.bio}</p>}

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
