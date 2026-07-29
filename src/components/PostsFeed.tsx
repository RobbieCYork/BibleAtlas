import { useEffect, useState } from "react";
import { supabase, displayFor, type Profile, type Note, type NoteComment } from "../lib/supabase";

interface PostsFeedProps {
  /** Whose public notes to show. */
  userId: string;
  /** The signed-in account's own id — needed to post a comment as someone. */
  viewerId?: string;
  /** Swaps the empty-state copy to "you" phrasing for the signed-in account's own posts. */
  isOwn?: boolean;
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

/** A user's notes they've marked public, shown like posts, with friend comments underneath —
 * mirrors the visibility notes.is_public/note_comments RLS already enforces (owner, or a friend of
 * the owner viewing/commenting on a public note). Backs both a friend's profile view and the
 * "My Posts" section of the signed-in account's own profile. */
export default function PostsFeed({ userId, viewerId, isOwn }: PostsFeedProps) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, Profile>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  // isOwn only: notes just flipped to private. Kept around briefly (instead of removed immediately)
  // so the user sees a "moved to private" confirmation before the post leaves the list.
  const [leavingNoteIds, setLeavingNoteIds] = useState<Record<string, boolean>>({});
  const [visibilityErrors, setVisibilityErrors] = useState<Record<string, string>>({});

  const fetchPosts = async () => {
    const { data: notesData } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
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
  }, [userId]);

  const handleAddComment = async (noteId: string) => {
    const body = (commentDrafts[noteId] ?? "").trim();
    if (!body || !viewerId) return;
    setCommentErrors((e) => ({ ...e, [noteId]: "" }));
    const { error } = await supabase.from("note_comments").insert({ note_id: noteId, author_id: viewerId, body });
    if (error) {
      setCommentErrors((e) => ({ ...e, [noteId]: "Couldn't post comment — try again." }));
      return;
    }
    setCommentDrafts((d) => ({ ...d, [noteId]: "" }));
    fetchPosts();
  };

  /** isOwn only: the same notes.is_public toggle MyNotesPanel's handleToggleNotePublic uses. Since
   * this feed only ever fetches is_public=true notes, the only direction a post can flip here is to
   * private — which means it stops being a "post" at all. Show a brief confirmation, then drop it
   * from the list, rather than yanking it away instantly. */
  const handleMakePrivate = async (note: Note) => {
    setVisibilityErrors((e) => ({ ...e, [note.id]: "" }));
    setLeavingNoteIds((l) => ({ ...l, [note.id]: true }));
    const { error } = await supabase.from("notes").update({ is_public: false }).eq("id", note.id);
    if (error) {
      setLeavingNoteIds((l) => ({ ...l, [note.id]: false }));
      setVisibilityErrors((e) => ({ ...e, [note.id]: "Couldn't update — try again." }));
      return;
    }
    setTimeout(() => {
      setPosts((prev) => (prev ? prev.filter((p) => p.note.id !== note.id) : prev));
      setLeavingNoteIds((l) => {
        const { [note.id]: _removed, ...rest } = l;
        return rest;
      });
    }, 1800);
  };

  if (posts === null) return <p className="comment-status">Loading posts…</p>;
  if (posts.length === 0)
    return (
      <p className="comment-status">
        {isOwn ? 'No public posts yet — mark a note "Public" in My Notes to share it.' : "No public posts yet."}
      </p>
    );

  return (
    <div className="friend-posts">
      {posts.map(({ note, comments }) => (
        <div key={note.id} className="friend-post">
          <p className="friend-post-ref">{refLabel(note)}</p>
          {note.quoted_text && <p className="verse-popup-quoted">"{note.quoted_text}"</p>}
          <p className="friend-post-text">{note.note_text}</p>
          {isOwn && (
            <div className="my-notes-actions friend-post-visibility">
              {leavingNoteIds[note.id] ? (
                <p className="comment-status">Moved to private — find it in My Notes.</p>
              ) : (
                <label className="my-notes-public-toggle">
                  <input type="checkbox" checked={note.is_public} onChange={() => handleMakePrivate(note)} />
                  🌐 Public — shows on your profile
                </label>
              )}
              {visibilityErrors[note.id] && <p className="comment-status">{visibilityErrors[note.id]}</p>}
            </div>
          )}
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
          {commentErrors[note.id] && <p className="comment-status">{commentErrors[note.id]}</p>}
        </div>
      ))}
    </div>
  );
}
