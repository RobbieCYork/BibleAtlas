import { useEffect, useState } from "react";
import { supabase, displayFor, formatJoinDate, type Profile, type Note, type NoteComment } from "../lib/supabase";
import ReadingProgressGrid from "./ReadingProgressGrid";

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

interface Post {
  note: Note;
  comments: NoteComment[];
}

function refLabel(note: Note): string {
  return note.start_verse === note.end_verse
    ? `${note.book} ${note.chapter}:${note.start_verse}`
    : `${note.book} ${note.chapter}:${note.start_verse}-${note.end_verse}`;
}

/** A friend's notes they've marked public, shown like posts, with friend comments underneath —
 * mirrors the visibility notes.is_public/note_comments RLS already enforces (owner, or a friend of
 * the owner viewing/commenting on a public note). */
function PostsFeed({ friendId, viewerId }: { friendId: string; viewerId?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, Profile>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const fetchPosts = async () => {
    const { data: notesData } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", friendId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    const notes = (notesData as Note[] | null) ?? [];
    if (notes.length === 0) {
      setPosts([]);
      return;
    }
    const { data: commentsData } = await supabase
      .from("note_comments")
      .select("*")
      .in(
        "note_id",
        notes.map((n) => n.id)
      )
      .order("created_at", { ascending: true });
    const comments = (commentsData as NoteComment[] | null) ?? [];
    setPosts(notes.map((note) => ({ note, comments: comments.filter((c) => c.note_id === note.id) })));

    const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
    if (authorIds.length > 0) {
      const { data: profilesData } = await supabase.from("profiles").select("*").in("id", authorIds);
      const map: Record<string, Profile> = {};
      (profilesData as Profile[] | null)?.forEach((p) => (map[p.id] = p));
      setAuthorProfiles(map);
    }
  };

  useEffect(() => {
    setPosts(null);
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId]);

  const handleAddComment = async (noteId: string) => {
    const body = (commentDrafts[noteId] ?? "").trim();
    if (!body || !viewerId) return;
    setCommentDrafts((d) => ({ ...d, [noteId]: "" }));
    await supabase.from("note_comments").insert({ note_id: noteId, author_id: viewerId, body });
    fetchPosts();
  };

  if (posts === null) return <p className="comment-status">Loading posts…</p>;
  if (posts.length === 0) return <p className="comment-status">No public posts yet.</p>;

  return (
    <div className="friend-posts">
      {posts.map(({ note, comments }) => (
        <div key={note.id} className="friend-post">
          <p className="friend-post-ref">{refLabel(note)}</p>
          {note.quoted_text && <p className="verse-popup-quoted">"{note.quoted_text}"</p>}
          <p className="friend-post-text">{note.note_text}</p>
          {comments.length > 0 && (
            <div className="friend-post-comments">
              {comments.map((c) => (
                <p key={c.id} className="friend-post-comment">
                  <strong>{authorProfiles[c.author_id] ? displayFor(authorProfiles[c.author_id]) : "Someone"}:</strong>{" "}
                  {c.body}
                </p>
              ))}
            </div>
          )}
          {viewerId && (
            <form
              className="friend-post-comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddComment(note.id);
              }}
            >
              <input
                type="text"
                value={commentDrafts[note.id] ?? ""}
                onChange={(e) => setCommentDrafts((d) => ({ ...d, [note.id]: e.target.value }))}
                placeholder="Add a comment…"
                maxLength={2000}
              />
              <button type="submit" disabled={!commentDrafts[note.id]?.trim()}>
                Post
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
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
            <PostsFeed friendId={friendId} viewerId={viewerId} />
          </div>
        </div>
      )}
    </div>
  );
}
