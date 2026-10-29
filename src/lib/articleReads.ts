import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { track } from "./analytics";

/* ============================================================================
 * "Mark this article as read" — the article twin of the Bible panel's
 * "Mark <chapter> as read" checkbox (sql/041_article_reads.sql).
 *
 * WHAT IT MIRRORS, AND WHERE IT DELIBERATELY DOES NOT
 * ----------------------------------------------------------------------------
 *  - Same audience: the control exists only while there is a session (a
 *    signed-in account or a "Continue as Guest" one — both carry a user id).
 *    With no session it renders nothing, exactly as BiblePanel's
 *    `{userId && <label className="bible-mark-read">…}` does.
 *  - Same writes: upsert (so re-ticking refreshes read_at) / delete, optimistic.
 *  - Same title signal: a small ✓ beside the article's heading, present only
 *    while the article is marked read.
 *  - NOT the chapter_read_reset window. That setting is worded, in Settings,
 *    about chapters and a yearly read-through of the Bible; article marks never
 *    expire. Nothing here would need to change but a cutoff in load() if that
 *    were ever wanted.
 *  - NOT per-item queries. BiblePanel asks for one chapter at a time because it
 *    shows one chapter at a time; an article heading and its foot both need the
 *    answer, across six panel types, so this loads the account's marks once per
 *    login into one shared set every surface reads synchronously.
 *
 * KEYS ARE PERMANENT. `id` is the record's own `id` (the same one in the public
 * URL /<kind>/<id> — see AGENTS.md "URLs are permanent once published"), never a
 * display name. Book introductions have no record id, so they key on the book's
 * canonical name, which is what bookIntros.ts and BiblePanel already key on.
 *
 * FAILURE MODES — chosen on purpose
 * ----------------------------------------------------------------------------
 *  - Table missing (sql/041 not applied yet): the control and the ✓ render
 *    nothing at all, for the rest of the page's life. A checkbox that silently
 *    forgets what you ticked is worse than no checkbox.
 *  - Any other load failure: render nothing (never claim "not read" when we do
 *    not know), and retry the next time an article opens.
 *  - A failed write: the optimistic change is rolled back, so the box shows
 *    what the database holds.
 * ========================================================================== */

/** The five public article kinds use the singular from their permanent URL (/place/<id>, …);
 * "book-intro" is the Bible panel's per-book introduction. Must match the CHECK in sql/041. */
export type ArticleKind = "place" | "site" | "person" | "topic" | "event" | "book-intro";

type Status = "signed-out" | "loading" | "ready" | "error" | "unavailable";

interface State {
  userId: string | null;
  status: Status;
  read: ReadonlySet<string>;
}

const keyOf = (kind: ArticleKind, id: string) => `${kind}\u0000${id}`;

let state: State = { userId: null, status: "signed-out", read: new Set() };
const listeners = new Set<() => void>();

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message ?? "";
  return msg.includes("article_reads") && /does not exist|could not find|schema cache/i.test(msg);
}

/** PostgREST caps a response (1,000 rows by default), so a long-time reader's marks are paged. */
const PAGE = 1000;

let loadSeq = 0;

async function load(userId: string | null) {
  const seq = ++loadSeq;
  if (!userId) {
    setState({ userId: null, status: "signed-out", read: new Set() });
    return;
  }
  setState({ userId, status: "loading", read: new Set() });
  try {
    const read = new Set<string>();
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("article_reads")
        .select("kind, article_id")
        .eq("user_id", userId)
        .order("kind")
        .order("article_id")
        .range(from, from + PAGE - 1);
      if (seq !== loadSeq) return; // a newer login/logout superseded this one
      if (error) {
        setState({ status: isMissingTableError(error) ? "unavailable" : "error" });
        return;
      }
      const rows = (data as { kind: ArticleKind; article_id: string }[] | null) ?? [];
      rows.forEach((r) => read.add(keyOf(r.kind, r.article_id)));
      if (rows.length < PAGE) break;
    }
    setState({ status: "ready", read });
  } catch {
    if (seq === loadSeq) setState({ status: "error" });
  }
}

let started = false;

function start() {
  if (started) return;
  started = true;
  let lastUserId: string | null | undefined;
  const onUser = (uid: string | null) => {
    if (uid === lastUserId) return;
    lastUserId = uid;
    // Deferred out of the auth callback: supabase-js warns that awaiting another supabase call
    // inside onAuthStateChange can deadlock its auth lock (same as lib/features.ts).
    setTimeout(() => void load(uid), 0);
  };
  supabase.auth.onAuthStateChange((_event, session) => onUser(session?.user.id ?? null));
  supabase.auth.getSession().then(({ data }) => onUser(data.session?.user.id ?? null));
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

/** Ticks or unticks one article. Optimistic, like BiblePanel's handleToggleChapterRead; unlike it,
 * a failed write is rolled back. */
export async function setArticleRead(kind: ArticleKind, id: string, read: boolean): Promise<void> {
  const { userId, status } = state;
  if (!userId || status !== "ready") return;
  const key = keyOf(kind, id);
  const apply = (on: boolean) => {
    if (state.userId !== userId) return; // signed out / switched account mid-write
    const next = new Set(state.read);
    if (on) next.add(key);
    else next.delete(key);
    setState({ read: next });
  };
  const was = state.read.has(key);
  if (was === read) return;
  apply(read);
  // Only the kind — never which article. analytics.ts: props are fixed labels, never what someone studies.
  if (read) track("article.read", { kind });
  try {
    const { error } = read
      ? await supabase
          .from("article_reads")
          .upsert({ user_id: userId, kind, article_id: id, read_at: new Date().toISOString() })
      : await supabase.from("article_reads").delete().eq("user_id", userId).eq("kind", kind).eq("article_id", id);
    if (error) {
      apply(was);
      if (isMissingTableError(error)) setState({ status: "unavailable" });
    }
  } catch {
    apply(was);
  }
}

export interface ArticleReadState {
  /** True only when the control should be drawn at all: a session exists and its marks are known. */
  available: boolean;
  read: boolean;
}

/** Read state for one article, shared by its heading ✓ and its foot checkbox. */
export function useArticleRead(kind: ArticleKind, id: string | null | undefined): ArticleReadState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // A load that failed for a transient reason is retried when the next article opens.
  useEffect(() => {
    if (state.status === "error") void load(state.userId);
  }, [kind, id]);
  const available = s.status === "ready" && !!id;
  return { available, read: available && s.read.has(keyOf(kind, id as string)) };
}

/** Test seam only — lets the render tests drive the store without a Supabase session. */
export const __testing = {
  setState: (next: { userId: string | null; status: Status; read?: [ArticleKind, string][] }) =>
    setState({
      userId: next.userId,
      status: next.status,
      read: new Set((next.read ?? []).map(([k, i]) => keyOf(k, i))),
    }),
  markStarted: () => {
    started = true;
  },
  load,
};
