import { useEffect, useState } from "react";
import {
  supabase,
  displayFor,
  formatPostDate,
  type Profile,
  type Note,
  type NoteComment,
  type Post as PostRow,
  type PostComment,
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

/** A friend's public note (verse commentary) and a friend's standalone post (a status update,
 * optionally with photos/video and tagged friends) render side by side, newest first — same
 * union PostsFeed's own feed uses, plus `author` since this feed spans multiple friends at once. */
type FeedItem =
  | { kind: "note"; id: string; createdAt: string; note: FriendNote; author: Profile | null; comments: NoteComment[] }
  | { kind: "post"; id: string; createdAt: string; post: PostRow; author: Profile | null; comments: PostComment[] };

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

  const [items, setItems] = useState<FeedItem[] | null>(null);
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
      setItems([]);
      return;
    }

    const [notesRes, postsRes] = await Promise.all([
      supabase.from("notes").select("*").in("user_id", friendIds).eq("is_public", true).order("created_at", { ascending: false }),
      supabase.from("posts").select("*").in("user_id", friendIds).eq("is_public", true).order("created_at", { ascending: false }),
    ]);
    const notes = (notesRes.data as FriendNote[] | null) ?? [];
    const posts = (postsRes.data as PostRow[] | null) ?? [];
    if (notes.length === 0 && posts.length === 0) {
      setItems([]);
      return;
    }

    const [noteCommentsRes, postCommentsRes] = await Promise.all([
      notes.length > 0
        ? supabase.from("note_comments").select("*").in("note_id", notes.map((n) => n.id)).order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as NoteComment[] }),
      posts.length > 0
        ? supabase.from("post_comments").select("*").in("post_id", posts.map((p) => p.id)).order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as PostComment[] }),
    ]);
    const noteComments = (noteCommentsRes.data as NoteComment[] | null) ?? [];
    const postComments = (postCommentsRes.data as PostComment[] | null) ?? [];

    const profileIds = new Set<string>(friendIds);
    noteComments.forEach((c) => profileIds.add(c.author_id));
    postComments.forEach((c) => profileIds.add(c.author_id));
    posts.forEach((p) => p.tagged_user_ids.forEach((id) => profileIds.add(id)));
    const { data: profilesData } = await supabase.from("profiles").select("*").in("id", Array.from(profileIds));
    const map: Record<string, Profile> = {};
    (profilesData as Profile[] | null)?.forEach((p) => (map[p.id] = p));
    setProfiles(map);

    const merged: FeedItem[] = [
      ...notes.map((note): FeedItem => ({
        kind: "note",
        id: note.id,
        createdAt: note.created_at,
        note,
        author: map[note.user_id] ?? null,
        comments: noteComments.filter((c) => c.note_id === note.id),
      })),
      ...posts.map((post): FeedItem => ({
        kind: "post",
        id: post.id,
        createdAt: post.created_at,
        post,
        author: map[post.user_id] ?? null,
        comments: postComments.filter((c) => c.post_id === post.id),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setItems(merged);
  };

  useEffect(() => {
    setItems(null);
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAddComment = async (item: FeedItem) => {
    const body = (commentDrafts[item.id] ?? "").trim();
    if (!body) return;
    setCommentErrors((e) => ({ ...e, [item.id]: "" }));
    const { error } =
      item.kind === "note"
        ? await supabase.from("note_comments").insert({ note_id: item.note.id, author_id: userId, body })
        : await supabase.from("post_comments").insert({ post_id: item.post.id, author_id: userId, body });
    if (error) {
      setCommentErrors((e) => ({ ...e, [item.id]: "Couldn't post comment — try again." }));
      return;
    }
    setCommentDrafts((d) => ({ ...d, [item.id]: "" }));
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

      {items === null && <p className="comment-status">Loading newsfeed…</p>}
      {items !== null && items.length === 0 && (
        <p className="comment-status">No public posts from friends yet — add friends to see their posts here.</p>
      )}
      {items !== null && items.length > 0 && (
        <div className="friend-posts">
          {items.map((item) => {
            const taggedProfiles = item.kind === "post" ? item.post.tagged_user_ids.map((id) => profiles[id]).filter(Boolean) : [];
            return (
              <div key={item.id} className="friend-post">
                <p className="friend-post-author">{item.author ? displayFor(item.author) : "Someone"}</p>
                <div className="friend-post-meta">
                  {item.kind === "note" ? <p className="friend-post-ref">{refLabel(item.note)}</p> : <span />}
                  <span className="friend-post-date">{formatPostDate(item.createdAt)}</span>
                </div>
                {item.kind === "note" && item.note.quoted_text && <p className="verse-popup-quoted">"{item.note.quoted_text}"</p>}
                <p className="friend-post-text">{item.kind === "note" ? item.note.note_text : item.post.body}</p>
                {item.kind === "post" && item.post.image_urls.length > 0 && (
                  <div className="post-media-grid">
                    {item.post.image_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="post-media-image" />
                      </a>
                    ))}
                  </div>
                )}
                {item.kind === "post" && item.post.video_url && (
                  <video className="post-media-video" src={item.post.video_url} controls />
                )}
                {taggedProfiles.length > 0 && (
                  <p className="post-tagged-friends">with {taggedProfiles.map((p) => displayFor(p)).join(", ")}</p>
                )}
                {item.comments.length > 0 && (
                  <div className="friend-post-comments">
                    {item.comments.map((c) => (
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
                    handleAddComment(item);
                  }}
                >
                  <input
                    type="text"
                    value={commentDrafts[item.id] ?? ""}
                    onChange={(e) => setCommentDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    placeholder="Add a comment…"
                    maxLength={2000}
                  />
                  <button type="submit" disabled={!commentDrafts[item.id]?.trim()}>
                    Post
                  </button>
                </form>
                {commentErrors[item.id] && <p className="comment-status">{commentErrors[item.id]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
