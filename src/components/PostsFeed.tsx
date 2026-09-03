import { useEffect, useRef, useState } from "react";
import { track } from "../lib/analytics";
import {
  supabase,
  displayFor,
  formatPostDate,
  isEdited,
  type Profile,
  type Note,
  type NoteComment,
  type Post as PostRow,
  type PostComment,
  type FriendRequest,
} from "../lib/supabase";
import InlineTextEditor from "./InlineTextEditor";

interface PostsFeedProps {
  /** Whose public notes/posts to show. */
  userId: string;
  /** The signed-in account's own id — needed to post a comment as someone. */
  viewerId?: string;
  /** Swaps the empty-state copy to "you" phrasing, and shows the composer + per-post owner actions,
   * for the signed-in account's own posts. */
  isOwn?: boolean;
}

/** A public note (verse commentary) and a standalone post (a status update, optionally with
 * photos/video and tagged friends — see sql/008_posts.sql) render side by side in the same feed,
 * newest first, without pretending they're the same shape underneath. */
type FeedItem =
  | { kind: "note"; id: string; createdAt: string; note: Note; comments: NoteComment[] }
  | { kind: "post"; id: string; createdAt: string; post: PostRow; comments: PostComment[] };

function refLabel(note: Note): string {
  return note.start_verse === note.end_verse
    ? `${note.book} ${note.chapter}:${note.start_verse}`
    : `${note.book} ${note.chapter}:${note.start_verse}-${note.end_verse}`;
}

/** A user's public notes (verse commentary) and standalone posts, merged into one feed with friend
 * comments underneath — mirrors the visibility notes/posts RLS already enforces (owner, or a friend
 * of the owner, viewing/commenting on something public). Backs both a friend's profile view and the
 * "My Posts" section of the signed-in account's own profile (which also gets a composer to start a
 * new post). */
export default function PostsFeed({ userId, viewerId, isOwn }: PostsFeedProps) {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  // Comments start collapsed behind a 💬N toggle below the media — see Newsfeed.tsx's identical use.
  const [openCommentIds, setOpenCommentIds] = useState<Set<string>>(new Set());
  const toggleComments = (id: string) =>
    setOpenCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // isOwn only: notes just flipped to private, or a post just removed. Kept around briefly (instead
  // of removed immediately) so the reader sees a confirmation before the item leaves the list.
  const [leavingIds, setLeavingIds] = useState<Record<string, boolean>>({});
  const [visibilityErrors, setVisibilityErrors] = useState<Record<string, string>>({});
  /** Id of the feed item currently open in its inline editor (only ever one at a time), plus its
   * working copy — same shape MyNotesPanel uses. The saved row is left untouched until Save
   * succeeds, so Cancel is just dropping the draft and a failed save keeps the typing on screen. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /** This feed is a single author's, so "can I edit what's in it" is decided once, not per item: the
   * signed-in account has to be looking at its own profile. FriendProfileView renders the same
   * component without `isOwn`, and RLS is the real gate either way (posts/notes both restrict UPDATE
   * to auth.uid() = user_id) — this only decides whether the affordance is offered. */
  const canEdit = !!isOwn && !!viewerId && viewerId === userId;

  const fetchFeed = async () => {
    const [notesRes, postsRes] = await Promise.all([
      supabase.from("notes").select("*").eq("user_id", userId).eq("is_public", true).order("created_at", { ascending: false }),
      supabase.from("posts").select("*").eq("user_id", userId).eq("is_public", true).order("created_at", { ascending: false }),
    ]);
    const notes = (notesRes.data as Note[] | null) ?? [];
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

    const merged: FeedItem[] = [
      ...notes.map((note): FeedItem => ({
        kind: "note",
        id: note.id,
        createdAt: note.created_at,
        note,
        comments: noteComments.filter((c) => c.note_id === note.id),
      })),
      ...posts.map((post): FeedItem => ({
        kind: "post",
        id: post.id,
        createdAt: post.created_at,
        post,
        comments: postComments.filter((c) => c.post_id === post.id),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setItems(merged);

    const profileIds = new Set<string>();
    noteComments.forEach((c) => profileIds.add(c.author_id));
    postComments.forEach((c) => profileIds.add(c.author_id));
    posts.forEach((p) => p.tagged_user_ids.forEach((id) => profileIds.add(id)));
    if (profileIds.size > 0) {
      const { data: profilesData } = await supabase.from("profiles").select("*").in("id", Array.from(profileIds));
      const map: Record<string, Profile> = {};
      (profilesData as Profile[] | null)?.forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
  };

  useEffect(() => {
    setItems(null);
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAddComment = async (item: FeedItem) => {
    const body = (commentDrafts[item.id] ?? "").trim();
    if (!body || !viewerId) return;
    setCommentErrors((e) => ({ ...e, [item.id]: "" }));
    const { error } =
      item.kind === "note"
        ? await supabase.from("note_comments").insert({ note_id: item.note.id, author_id: viewerId, body })
        : await supabase.from("post_comments").insert({ post_id: item.post.id, author_id: viewerId, body });
    if (error) {
      setCommentErrors((e) => ({ ...e, [item.id]: "Couldn't post comment — try again." }));
      return;
    }
    setCommentDrafts((d) => ({ ...d, [item.id]: "" }));
    fetchFeed();
  };

  /** Who may delete a comment, mirroring the RLS both comment tables now enforce (note_comments has
   * always had it; post_comments got it in sql/022_post_comment_delete.sql): the comment's author,
   * or the owner of the note/post it sits under. This feed only ever renders one owner's items, so
   * `userId === viewerId` IS parent ownership. */
  const canRemoveComment = (c: NoteComment | PostComment) =>
    !!viewerId && (c.author_id === viewerId || userId === viewerId);

  /** Drops the row from local state on success rather than refetching — the whole feed reloading
   * would collapse the open comment thread the reader is looking at. A failure (an RLS refusal,
   * most likely) leaves the comment in place and says so under the thread. */
  const handleRemoveComment = async (item: FeedItem, commentId: string) => {
    setCommentErrors((e) => ({ ...e, [item.id]: "" }));
    const { error } =
      item.kind === "note"
        ? await supabase.from("note_comments").delete().eq("id", commentId)
        : await supabase.from("post_comments").delete().eq("id", commentId);
    if (error) {
      setCommentErrors((e) => ({ ...e, [item.id]: "Couldn't remove comment — try again." }));
      return;
    }
    setItems((prev) =>
      prev
        ? prev.map((i) =>
            i.id === item.id ? ({ ...i, comments: i.comments.filter((c) => c.id !== commentId) } as FeedItem) : i,
          )
        : prev,
    );
  };

  const startEdit = (item: FeedItem) => {
    setEditingId(item.id);
    setEditDraft(item.kind === "note" ? item.note.note_text : item.post.body);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
    setEditError(null);
    setSavingEdit(false);
  };

  /** Writes the edited text back to the row this feed already holds in state (the list is a plain
   * fetch, not a realtime subscription), so the change shows without a refetch. `.select().single()`
   * so an RLS rejection comes back as zero rows and errors rather than looking like a success — on
   * failure the editor stays open with the draft intact. */
  const handleSaveEdit = async (item: FeedItem) => {
    const text = editDraft.trim();
    if (!text || savingEdit) return;
    const original = item.kind === "note" ? item.note.note_text : item.post.body;
    if (text === original) {
      cancelEdit();
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const updatedAt = new Date().toISOString();
    const { data, error } =
      item.kind === "note"
        ? await supabase.from("notes").update({ note_text: text, updated_at: updatedAt }).eq("id", item.note.id).select().single()
        : await supabase.from("posts").update({ body: text, updated_at: updatedAt }).eq("id", item.post.id).select().single();
    setSavingEdit(false);
    if (error || !data) {
      setEditError(error?.message ? `Couldn't save: ${error.message}` : "Couldn't save your changes. Your text is still here — try again.");
      return;
    }
    setItems((prev) =>
      prev
        ? prev.map((i) => {
            if (i.id !== item.id) return i;
            return i.kind === "note" ? { ...i, note: data as Note } : { ...i, post: data as PostRow };
          })
        : prev
    );
    cancelEdit();
  };

  /** isOwn only: the same notes.is_public toggle MyNotesPanel's handleToggleNotePublic uses. Since
   * this feed only ever fetches is_public=true notes, the only direction a post can flip here is to
   * private — which means it stops being a "post" at all. Show a brief confirmation, then drop it
   * from the list, rather than yanking it away instantly. */
  const handleMakePrivate = async (note: Note) => {
    if (editingId === note.id) cancelEdit();
    setVisibilityErrors((e) => ({ ...e, [note.id]: "" }));
    setLeavingIds((l) => ({ ...l, [note.id]: true }));
    const { error } = await supabase.from("notes").update({ is_public: false }).eq("id", note.id);
    if (error) {
      setLeavingIds((l) => ({ ...l, [note.id]: false }));
      setVisibilityErrors((e) => ({ ...e, [note.id]: "Couldn't update — try again." }));
      return;
    }
    setTimeout(() => {
      setItems((prev) => (prev ? prev.filter((i) => i.id !== note.id) : prev));
      setLeavingIds((l) => {
        const { [note.id]: _removed, ...rest } = l;
        return rest;
      });
    }, 1800);
  };

  const handleRemovePost = async (post: PostRow) => {
    if (editingId === post.id) cancelEdit();
    setVisibilityErrors((e) => ({ ...e, [post.id]: "" }));
    setLeavingIds((l) => ({ ...l, [post.id]: true }));
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      setLeavingIds((l) => ({ ...l, [post.id]: false }));
      setVisibilityErrors((e) => ({ ...e, [post.id]: "Couldn't remove — try again." }));
      return;
    }
    setTimeout(() => {
      setItems((prev) => (prev ? prev.filter((i) => i.id !== post.id) : prev));
      setLeavingIds((l) => {
        const { [post.id]: _removed, ...rest } = l;
        return rest;
      });
    }, 1200);
  };

  return (
    <div className="posts-feed">
      {isOwn && <PostComposer userId={userId} onPosted={fetchFeed} />}

      {items === null && <p className="comment-status">Loading posts…</p>}
      {items !== null && items.length === 0 && (
        <p className="comment-status">
          {isOwn ? "No public posts yet — write one above, or mark a note \"Public\" in My Notes." : "No public posts yet."}
        </p>
      )}
      {items !== null && items.length > 0 && (
        <div className="friend-posts">
          {items.map((item) => {
            const taggedProfiles = item.kind === "post" ? item.post.tagged_user_ids.map((id) => profiles[id]).filter(Boolean) : [];
            return (
              <div key={item.id} className="friend-post">
                <div className="friend-post-meta">
                  {item.kind === "note" ? (
                    <p className="friend-post-ref">{refLabel(item.note)}</p>
                  ) : (
                    <span />
                  )}
                  <span className="friend-post-date">{formatPostDate(item.createdAt)}</span>
                </div>
                {item.kind === "note" && item.note.quoted_text && <p className="verse-popup-quoted">"{item.note.quoted_text}"</p>}
                {editingId === item.id ? (
                  <InlineTextEditor
                    value={editDraft}
                    onChange={setEditDraft}
                    onSave={() => handleSaveEdit(item)}
                    onCancel={cancelEdit}
                    saving={savingEdit}
                    error={editError}
                    label={item.kind === "note" ? "Edit note" : "Edit post"}
                    maxLength={item.kind === "note" ? 8000 : 2000}
                  />
                ) : (
                  <p className="friend-post-text">
                    {item.kind === "note" ? item.note.note_text : item.post.body}
                    {isEdited(item.kind === "note" ? item.note : item.post) && (
                      <span className="my-notes-edited-flag"> (edited)</span>
                    )}
                  </p>
                )}

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

                {isOwn && item.kind === "note" && (
                  <div className="my-notes-actions friend-post-visibility">
                    {leavingIds[item.id] ? (
                      <p className="comment-status">Moved to private — find it in My Notes.</p>
                    ) : (
                      <>
                        <label className="my-notes-public-toggle">
                          <input type="checkbox" checked={item.note.is_public} onChange={() => handleMakePrivate(item.note)} />
                          🌐 Public — shows on your profile
                        </label>
                        {canEdit && editingId !== item.id && (
                          <button type="button" className="my-notes-edit-button" onClick={() => startEdit(item)}>
                            ✎ Edit
                          </button>
                        )}
                      </>
                    )}
                    {visibilityErrors[item.id] && <p className="comment-status">{visibilityErrors[item.id]}</p>}
                  </div>
                )}
                {isOwn && item.kind === "post" && (
                  <div className="my-notes-actions friend-post-visibility">
                    {leavingIds[item.id] ? (
                      <p className="comment-status">Removed.</p>
                    ) : (
                      <div className="my-notes-actions-buttons">
                        {canEdit && editingId !== item.id && (
                          <button type="button" className="my-notes-edit-button" onClick={() => startEdit(item)}>
                            ✎ Edit
                          </button>
                        )}
                        <button type="button" className="my-notes-delete" onClick={() => handleRemovePost(item.post)}>
                          Remove
                        </button>
                      </div>
                    )}
                    {visibilityErrors[item.id] && <p className="comment-status">{visibilityErrors[item.id]}</p>}
                  </div>
                )}

                <button type="button" className="friend-post-comment-toggle" onClick={() => toggleComments(item.id)}>
                  💬 {item.comments.length}
                </button>
                {openCommentIds.has(item.id) && item.comments.length > 0 && (
                  <div className="friend-post-comments">
                    {item.comments.map((c) => (
                      <p key={c.id} className="friend-post-comment">
                        <strong>{profiles[c.author_id] ? displayFor(profiles[c.author_id]) : "Someone"}:</strong> {c.body}
                        {canRemoveComment(c) && (
                          <button
                            type="button"
                            className="friend-post-comment-remove"
                            title="Remove this comment"
                            aria-label="Remove this comment"
                            onClick={() => handleRemoveComment(item, c.id)}
                          >
                            ×
                          </button>
                        )}
                      </p>
                    ))}
                  </div>
                )}
                {viewerId && (
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
                )}
                {commentErrors[item.id] && <p className="comment-status">{commentErrors[item.id]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The "write a new post" form at the top of the signed-in account's own "My Posts" — a status
 * update, optionally with photos/a video and friends tagged in it. Uploads go to the `post-media`
 * storage bucket under this account's own folder (see sql/008_posts.sql). */
function PostComposer({ userId, onPosted }: { userId: string; onPosted: () => void }) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tagMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) setTagMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tagMenuOpen]);

  useEffect(() => {
    const loadFriends = async () => {
      const { data: reqData } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("status", "accepted")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      const friendIds = ((reqData as FriendRequest[] | null) ?? []).map((r) =>
        r.sender_id === userId ? r.receiver_id : r.sender_id
      );
      if (friendIds.length === 0) return;
      const { data: profilesData } = await supabase.from("profiles").select("*").in("id", friendIds);
      setFriends((profilesData as Profile[] | null) ?? []);
    };
    loadFriends();
  }, [userId]);

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) setImages((prev) => [...prev, ...files]);
  };

  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setVideo(file);
  };

  const toggleTag = (friendId: string) => {
    setTaggedIds((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]));
  };

  const canPost = (body.trim().length > 0 || images.length > 0 || video !== null) && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError(null);
    try {
      const imageUrls = await Promise.all(
        images.map(async (file, i) => {
          const path = `${userId}/${Date.now()}-${i}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file);
          if (uploadError) throw uploadError;
          return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
        })
      );
      let videoUrl: string | null = null;
      if (video) {
        const path = `${userId}/${Date.now()}-${video.name}`;
        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, video);
        if (uploadError) throw uploadError;
        videoUrl = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      }
      track("post.create");
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: userId,
        body: body.trim(),
        image_urls: imageUrls,
        video_url: videoUrl,
        tagged_user_ids: taggedIds,
        is_public: isPublic,
      });
      if (insertError) throw insertError;
      setBody("");
      setImages([]);
      setVideo(null);
      setTaggedIds([]);
      onPosted();
    } catch {
      setError("Couldn't post — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share something…"
        rows={3}
        maxLength={2000}
      />

      {(images.length > 0 || video) && (
        <div className="post-composer-media-preview">
          {images.map((file, i) => (
            <div key={`${file.name}-${i}`} className="post-composer-media-item">
              <img src={URL.createObjectURL(file)} alt="" />
              <button type="button" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove photo">
                ×
              </button>
            </div>
          ))}
          {video && (
            <div className="post-composer-media-item post-composer-media-item-video">
              <span>🎬 {video.name}</span>
              <button type="button" onClick={() => setVideo(null)} aria-label="Remove video">
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <div className="post-composer-actions">
        <label className="post-composer-media-button">
          🖼️ Photo
          <input type="file" accept="image/*" multiple hidden onChange={handleImagesSelected} />
        </label>
        <label className="post-composer-media-button">
          🎥 Video
          <input type="file" accept="video/*" hidden onChange={handleVideoSelected} disabled={!!video} />
        </label>
        {friends.length > 0 && (
          <div className="post-composer-tag-menu-wrap" ref={tagMenuRef}>
            <button
              type="button"
              className="post-composer-media-button"
              onClick={() => setTagMenuOpen((o) => !o)}
              aria-expanded={tagMenuOpen}
            >
              🏷️ Tag friends{taggedIds.length > 0 ? ` (${taggedIds.length})` : ""}
            </button>
            {tagMenuOpen && (
              <div className="post-composer-tag-menu">
                {friends.map((f) => (
                  <label key={f.id} className="post-composer-tag-menu-item">
                    <input type="checkbox" checked={taggedIds.includes(f.id)} onChange={() => toggleTag(f.id)} />
                    {displayFor(f)}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {taggedIds.length > 0 && (
        <p className="post-tagged-friends">
          Tagging: {friends.filter((f) => taggedIds.includes(f.id)).map((f) => displayFor(f)).join(", ")}
        </p>
      )}

      <label className="my-notes-public-toggle">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        {isPublic ? "🌐 Public — shows on your profile" : "🔒 Keep private"}
      </label>

      <button type="submit" className="post-composer-submit" disabled={!canPost}>
        {busy ? "Posting…" : "Post"}
      </button>
      {error && <p className="comment-status">{error}</p>}
    </form>
  );
}
