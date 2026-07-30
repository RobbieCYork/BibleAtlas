import { useEffect, useState } from "react";
import { supabase, displayFor, type Profile, type Note, type NoteComment, type FriendRequest } from "../lib/supabase";
import { getDailyVerse, formatDailyReference } from "../data/dailyVerse";

interface NewsfeedProps {
  /** The signed-in account viewing its own Newsfeed tab — used both to find its friends and to post
   * comments as this account, same role `viewerId` plays in PostsFeed. */
  userId: string;
  /** Jumps the Bible reader to the daily verse's reference, same handler MyProfileView already wires
   * up for the favorite-verse link. */
  onGoToVerse: (reference: string) => void;
}

/** notes.user_id isn't part of the shared `Note` type (every other consumer already knows whose
 * notes it fetched), but this feed spans multiple friends' notes at once and needs it to label each
 * post's author — same column PostsFeed and MyNotesPanel already filter by. */
type FriendNote = Note & { user_id: string };

interface Post {
  note: FriendNote;
  author: Profile | null;
  comments: NoteComment[];
}

function refLabel(note: Note): string {
  return note.start_verse === note.end_verse
    ? `${note.book} ${note.chapter}:${note.start_verse}`
    : `${note.book} ${note.chapter}:${note.start_verse}-${note.end_verse}`;
}

/** The signed-in account's Newsfeed tab: today's Verse & Place of the Day prompt (same rotation as
 * the app's daily-verse overlay, shown again here so it doesn't disappear once dismissed for the
 * day) followed by every public post from this account's accepted friends, newest first — the
 * friends-scoped counterpart to PostsFeed's single-author "My Posts" list. */
export default function Newsfeed({ userId, onGoToVerse }: NewsfeedProps) {
  const [dailyVerse] = useState(() => getDailyVerse());
  const dailyVerseReference = formatDailyReference(dailyVerse);
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
  }, [dailyVerseReference]);

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});

  const fetchFeed = async () => {
    const { data: reqData } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("status", "accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    const friendIds = ((reqData as FriendRequest[] | null) ?? []).map((r) =>
      r.sender_id === userId ? r.receiver_id : r.sender_id
    );
    if (friendIds.length === 0) {
      setPosts([]);
      return;
    }

    const { data: notesData } = await supabase
      .from("notes")
      .select("*")
      .in("user_id", friendIds)
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    const notes = (notesData as FriendNote[] | null) ?? [];
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

    const profileIds = Array.from(new Set([...friendIds, ...comments.map((c) => c.author_id)]));
    const { data: profilesData } = await supabase.from("profiles").select("*").in("id", profileIds);
    const map: Record<string, Profile> = {};
    (profilesData as Profile[] | null)?.forEach((p) => (map[p.id] = p));
    setProfiles(map);

    setPosts(
      notes.map((note) => ({
        note,
        author: map[note.user_id] ?? null,
        comments: comments.filter((c) => c.note_id === note.id),
      }))
    );
  };

  useEffect(() => {
    setPosts(null);
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAddComment = async (noteId: string) => {
    const body = (commentDrafts[noteId] ?? "").trim();
    if (!body) return;
    setCommentErrors((e) => ({ ...e, [noteId]: "" }));
    const { error } = await supabase.from("note_comments").insert({ note_id: noteId, author_id: userId, body });
    if (error) {
      setCommentErrors((e) => ({ ...e, [noteId]: "Couldn't post comment — try again." }));
      return;
    }
    setCommentDrafts((d) => ({ ...d, [noteId]: "" }));
    fetchFeed();
  };

  return (
    <div className="newsfeed">
      <div className="friend-post newsfeed-daily-verse">
        <p className="friend-post-ref">
          <button type="button" className="newsfeed-daily-verse-ref" onClick={() => onGoToVerse(dailyVerseReference)}>
            📖 Verse of the Day — {dailyVerseReference}
          </button>
        </p>
        {dailyVerseText && <p className="verse-popup-quoted">"{dailyVerseText}"</p>}
        <p className="daily-verse-prompt">{dailyVerse.prompt}</p>
      </div>

      {posts === null && <p className="comment-status">Loading newsfeed…</p>}
      {posts !== null && posts.length === 0 && (
        <p className="comment-status">No public posts from friends yet — add friends to see their posts here.</p>
      )}
      {posts !== null && posts.length > 0 && (
        <div className="friend-posts">
          {posts.map(({ note, author, comments }) => (
            <div key={note.id} className="friend-post">
              <p className="friend-post-author">{author ? displayFor(author) : "Someone"}</p>
              <p className="friend-post-ref">{refLabel(note)}</p>
              {note.quoted_text && <p className="verse-popup-quoted">"{note.quoted_text}"</p>}
              <p className="friend-post-text">{note.note_text}</p>
              {comments.length > 0 && (
                <div className="friend-post-comments">
                  {comments.map((c) => (
                    <p key={c.id} className="friend-post-comment">
                      <strong>{profiles[c.author_id] ? displayFor(profiles[c.author_id]) : "Someone"}:</strong>{" "}
                      {c.body}
                    </p>
                  ))}
                </div>
              )}
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
              {commentErrors[note.id] && <p className="comment-status">{commentErrors[note.id]}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
