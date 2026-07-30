import { useEffect, useState } from "react";
import {
  supabase,
  displayFor,
  formatPostDate,
  type Profile,
  type Note,
  type NoteComment,
  type FriendRequest,
} from "../lib/supabase";
import { getDailyVerse, formatDailyReference, getLocalDayKey } from "../data/dailyVerse";

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

/** The signed-in account's Newsfeed tab: today's Verse & Place of the Day prompt — recomputed fresh
 * every time this mounts (getDailyVerse always resolves off the current date, same as the app's
 * daily-verse overlay), so a new day always brings a new verse here even if the overlay itself was
 * already dismissed for today — followed by every public post from this account's accepted friends,
 * newest first — the friends-scoped counterpart to PostsFeed's single-author "My Posts" list. */
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

  // This account's own response to today's prompt, posted the same way the daily-verse overlay's
  // response form does (a note tagged with the verse's reference) — undefined while loading, null
  // once confirmed there isn't one yet today. Matched by day, not just by reference, since the
  // ~5-week rotation revisits the same verse — a response from last time it came up shouldn't read
  // as "already answered today."
  const [myResponse, setMyResponse] = useState<FriendNote | null | undefined>(undefined);
  const [responseDraft, setResponseDraft] = useState("");
  const [responsePublic, setResponsePublic] = useState(true);
  const [responseBusy, setResponseBusy] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  const fetchMyResponse = async () => {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .eq("book", dailyVerse.reference.book)
      .eq("chapter", dailyVerse.reference.chapter)
      .eq("start_verse", dailyVerse.reference.verse)
      .eq("end_verse", dailyVerse.reference.verse)
      .order("created_at", { ascending: false });
    const notes = (data as FriendNote[] | null) ?? [];
    const today = getLocalDayKey();
    setMyResponse(notes.find((n) => getLocalDayKey(new Date(n.created_at)) === today) ?? null);
  };

  useEffect(() => {
    setMyResponse(undefined);
    fetchMyResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dailyVerseReference]);

  const postResponse = async () => {
    const text = responseDraft.trim();
    if (!text) return;
    setResponseBusy(true);
    setResponseError(null);
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        book: dailyVerse.reference.book,
        chapter: dailyVerse.reference.chapter,
        start_verse: dailyVerse.reference.verse,
        end_verse: dailyVerse.reference.verse,
        translation: "web",
        quoted_text: dailyVerseText,
        note_text: text,
        is_public: responsePublic,
      })
      .select()
      .single();
    setResponseBusy(false);
    if (error || !data) {
      setResponseError("Couldn't post — try again.");
      return;
    }
    setMyResponse(data as FriendNote);
    setResponseDraft("");
  };

  const removeResponse = async () => {
    if (!myResponse) return;
    setResponseBusy(true);
    setResponseError(null);
    const { error } = await supabase.from("notes").delete().eq("id", myResponse.id);
    setResponseBusy(false);
    if (error) {
      setResponseError("Couldn't remove — try again.");
      return;
    }
    setMyResponse(null);
  };

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
        <div className="friend-post-meta">
          <button type="button" className="newsfeed-daily-verse-ref" onClick={() => onGoToVerse(dailyVerseReference)}>
            📖 Verse of the Day — {dailyVerseReference}
          </button>
          <span className="friend-post-date">{formatPostDate(new Date().toISOString())}</span>
        </div>
        {dailyVerseText && <p className="verse-popup-quoted">"{dailyVerseText}"</p>}
        <p className="daily-verse-prompt">{dailyVerse.prompt}</p>

        {myResponse === undefined && <p className="comment-status">Loading your response…</p>}

        {myResponse === null && (
          <form
            className="daily-verse-response-form"
            onSubmit={(e) => {
              e.preventDefault();
              postResponse();
            }}
          >
            <textarea
              className="daily-verse-response-input"
              value={responseDraft}
              onChange={(e) => setResponseDraft(e.target.value)}
              placeholder="Write your response…"
              rows={3}
              maxLength={2000}
            />
            <label className="my-notes-public-toggle">
              <input type="checkbox" checked={responsePublic} onChange={(e) => setResponsePublic(e.target.checked)} />
              {responsePublic ? "🌐 Share publicly on my profile" : "🔒 Keep private"}
            </label>
            <button type="submit" className="daily-verse-response-submit" disabled={!responseDraft.trim() || responseBusy}>
              {responseBusy ? "Posting…" : responsePublic ? "Post to Newsfeed" : "Save privately"}
            </button>
          </form>
        )}

        {myResponse && (
          <div className="newsfeed-daily-verse-response">
            <p className="friend-post-text">{myResponse.note_text}</p>
            <div className="my-notes-actions friend-post-visibility">
              <span className="comment-status">
                {myResponse.is_public ? "🌐 Posted to your profile" : "🔒 Saved privately"} —{" "}
                {formatPostDate(myResponse.created_at)}
              </span>
              <button type="button" className="my-notes-delete" onClick={removeResponse} disabled={responseBusy}>
                {responseBusy ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        )}

        {responseError && <p className="comment-status">{responseError}</p>}
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
              <div className="friend-post-meta">
                <p className="friend-post-ref">{refLabel(note)}</p>
                <span className="friend-post-date">{formatPostDate(note.created_at)}</span>
              </div>
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
