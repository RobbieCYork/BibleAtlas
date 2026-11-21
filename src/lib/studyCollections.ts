import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { track } from "./analytics";
import { suggestReference } from "./bibleReference";

/* ============================================================================
 * Study Collections — a Capstone Plus feature (sql/046_study_collections.sql).
 *
 * A reader's own named, ordered lists of things from around the app: places and sites on the map,
 * people, topics, timeline events, Bible references and their own verse notes. Every item is a
 * (kind, ref_id) pair:
 *   place / site / person / topic / event   ref_id = the record's own `id` (src/data/*.ts) — the
 *                                           permanent id from the public URL, as article_reads uses
 *   verse                                   ref_id = "John 3" / "John 3:16" / "John 3:16-18"
 *   note                                    ref_id = public.notes.id of a note this reader owns
 *
 * TIERING. The server decides: sql/046's insert/update policies need has_entitlement('plus')
 * (sql/043), which is true for every signed-in account while 'paid.everyone_has_plus' is on.
 * Reading and deleting your own rows never needs Plus — a reader whose Plus lapses still sees what
 * they built and can clear it out. This module only mirrors that answer so the UI can show the
 * Capstone Plus prompt instead of a control that would fail; it grants nothing.
 *
 * FAILURE MODES — chosen on purpose, same as lib/articleReads.ts
 *  - Table missing (sql/046 not applied yet): status "unavailable"; every surface renders NOTHING
 *    (no tab, no button). Merging this before the migration is applied changes nothing anyone sees.
 *  - Any other load failure: status "error"; surfaces render nothing and retry on next open.
 *  - A failed write rolls back its optimistic change and returns a message to show.
 *
 * Loaded once per login into one shared store, because the "Add to collection" button on every
 * article needs to know synchronously which collections already hold that item.
 * ========================================================================== */

export type CollectionItemKind = "place" | "site" | "person" | "topic" | "event" | "verse" | "note";

export interface StudyCollection {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyCollectionItem {
  id: string;
  collection_id: string;
  kind: CollectionItemKind;
  ref_id: string;
  position: number;
  added_at: string;
}

type Status = "signed-out" | "loading" | "ready" | "error" | "unavailable";

export interface CollectionsState {
  userId: string | null;
  status: Status;
  /** has_entitlement('plus'). null until asked. */
  entitled: boolean | null;
  collections: StudyCollection[];
  items: StudyCollectionItem[];
}

/** Server caps (sql/046). Mirrored only to word the message before the server refuses. */
export const MAX_COLLECTIONS = 100;
export const MAX_ITEMS = 500;
export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 1000;

/** Must match sql/046's study_collection_items_ref_shape for 'verse'. */
export const VERSE_REF_SHAPE = /^[1-3]? ?[A-Za-z][A-Za-z ]{0,40} [0-9]{1,3}(:[0-9]{1,3}(-[0-9]{1,3})?)?$/;

/** "john 3:16" -> "John 3:16", using the same parser as the Bible search bar. Null if it is not a
 * reference with a chapter. */
export function canonicalVerseRef(input: string): string | null {
  const s = suggestReference(input);
  if (!s || !s.explicitChapter) return null;
  let ref = `${s.book} ${s.chapter}`;
  if (s.verse) {
    ref += `:${s.verse}`;
    if (s.endVerse && s.endVerse > s.verse) ref += `-${s.endVerse}`;
  }
  return VERSE_REF_SHAPE.test(ref) ? ref : null;
}

let state: CollectionsState = { userId: null, status: "signed-out", entitled: null, collections: [], items: [] };
const listeners = new Set<() => void>();

function setState(next: Partial<CollectionsState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

type PgError = { code?: string; message?: string } | null | undefined;

function isMissingTableError(error: PgError): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message ?? "";
  return msg.includes("study_collection") && /does not exist|could not find|schema cache/i.test(msg);
}

/** A message a reader can act on, from a PostgREST/Postgres error. */
function messageFor(error: PgError): string {
  const code = error?.code;
  if (code === "54000") {
    return /item/i.test(error?.message ?? "")
      ? `A collection can hold up to ${MAX_ITEMS} items.`
      : `You can have up to ${MAX_COLLECTIONS} collections.`;
  }
  if (code === "42501") return "Study collections are part of Capstone Plus.";
  if (code === "23514") return "That couldn't be saved — check its length and try again.";
  if (code === "23503") return "That item couldn't be found.";
  return "That couldn't be saved just now. Please try again.";
}

const PAGE = 1000;
let loadSeq = 0;
let entitlementAskedAt = 0;
const ENTITLEMENT_TTL_MS = 60 * 1000;

async function askEntitlement(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("has_entitlement", { p: "plus" });
    return !error && data === true;
  } catch {
    return false;
  }
}

async function load(userId: string | null) {
  const seq = ++loadSeq;
  if (!userId) {
    setState({ userId: null, status: "signed-out", entitled: null, collections: [], items: [] });
    return;
  }
  setState({ userId, status: "loading", collections: [], items: [] });
  try {
    const { data: cols, error: colErr } = await supabase
      .from("study_collections")
      .select("id, title, description, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (seq !== loadSeq) return;
    if (colErr) {
      setState({ status: isMissingTableError(colErr) ? "unavailable" : "error" });
      return;
    }
    const items: StudyCollectionItem[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("study_collection_items")
        .select("id, collection_id, kind, ref_id, position, added_at")
        .eq("user_id", userId)
        .order("collection_id")
        .order("position")
        .range(from, from + PAGE - 1);
      if (seq !== loadSeq) return;
      if (error) {
        setState({ status: isMissingTableError(error) ? "unavailable" : "error" });
        return;
      }
      const rows = (data as StudyCollectionItem[] | null) ?? [];
      items.push(...rows);
      if (rows.length < PAGE) break;
    }
    const entitled = await askEntitlement();
    entitlementAskedAt = Date.now();
    if (seq !== loadSeq) return;
    setState({ status: "ready", entitled, collections: (cols as StudyCollection[] | null) ?? [], items });
  } catch {
    if (seq === loadSeq) setState({ status: "error" });
  }
}

/** Re-ask has_entitlement (e.g. after a checkout). Cheap; skipped if asked within the last minute. */
export async function refreshCollectionsEntitlement(force = false): Promise<void> {
  if (state.status !== "ready") return;
  if (!force && Date.now() - entitlementAskedAt < ENTITLEMENT_TTL_MS) return;
  entitlementAskedAt = Date.now();
  const userId = state.userId;
  const entitled = await askEntitlement();
  if (state.userId === userId) setState({ entitled });
}

let started = false;

function start() {
  if (started) return;
  started = true;
  let lastUserId: string | null | undefined;
  const onUser = (uid: string | null) => {
    if (uid === lastUserId) return;
    lastUserId = uid;
    // Deferred out of the auth callback (supabase-js auth lock; same as lib/articleReads.ts).
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

export function useStudyCollections(): CollectionsState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (state.status === "error") void load(state.userId);
    else void refreshCollectionsEntitlement();
  }, []);
  return s;
}

/** Items of one collection, in the reader's order. */
export function itemsOf(s: CollectionsState, collectionId: string): StudyCollectionItem[] {
  return s.items.filter((i) => i.collection_id === collectionId).sort((a, b) => a.position - b.position);
}

/** Ids of the collections that already hold (kind, refId). */
export function collectionsHolding(s: CollectionsState, kind: CollectionItemKind, refId: string): Set<string> {
  return new Set(s.items.filter((i) => i.kind === kind && i.ref_id === refId).map((i) => i.collection_id));
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; message: string };

function guard(): { userId: string } | null {
  return state.status === "ready" && state.userId ? { userId: state.userId } : null;
}

function onWriteError(error: PgError): Result<never> {
  if (error?.code === "42501") setState({ entitled: false });
  return { ok: false, message: messageFor(error) };
}

export async function createCollection(title: string, description?: string | null): Promise<Result<StudyCollection>> {
  const g = guard();
  if (!g) return { ok: false, message: messageFor(null) };
  const t = title.trim();
  if (!t) return { ok: false, message: "Give the collection a name." };
  if (t.length > MAX_TITLE) return { ok: false, message: `Names can be up to ${MAX_TITLE} characters.` };
  const d = description?.trim() || null;
  if (d && d.length > MAX_DESCRIPTION) return { ok: false, message: `Descriptions can be up to ${MAX_DESCRIPTION} characters.` };
  if (state.collections.length >= MAX_COLLECTIONS) return { ok: false, message: messageFor({ code: "54000" }) };
  try {
    const { data, error } = await supabase
      .from("study_collections")
      .insert({ title: t, description: d })
      .select("id, title, description, created_at, updated_at")
      .single();
    if (error || !data) return onWriteError(error);
    if (state.userId !== g.userId) return { ok: false, message: messageFor(null) };
    setState({ collections: [...state.collections, data as StudyCollection] });
    track("collections.create");
    return { ok: true, value: data as StudyCollection };
  } catch {
    return { ok: false, message: messageFor(null) };
  }
}

export async function updateCollection(id: string, title: string, description: string | null): Promise<Result> {
  const g = guard();
  if (!g) return { ok: false, message: messageFor(null) };
  const t = title.trim();
  if (!t) return { ok: false, message: "Give the collection a name." };
  if (t.length > MAX_TITLE) return { ok: false, message: `Names can be up to ${MAX_TITLE} characters.` };
  const d = description?.trim() || null;
  if (d && d.length > MAX_DESCRIPTION) return { ok: false, message: `Descriptions can be up to ${MAX_DESCRIPTION} characters.` };
  const before = state.collections;
  setState({ collections: before.map((c) => (c.id === id ? { ...c, title: t, description: d } : c)) });
  try {
    const { data, error } = await supabase.from("study_collections").update({ title: t, description: d }).eq("id", id).select("id");
    // An update the policy filters out (no Plus) returns zero rows and no error.
    if (error || !data || (data as unknown[]).length === 0) {
      if (state.userId === g.userId) setState({ collections: before });
      return error ? onWriteError(error) : onWriteError({ code: "42501" });
    }
    return { ok: true, value: undefined };
  } catch {
    if (state.userId === g.userId) setState({ collections: before });
    return { ok: false, message: messageFor(null) };
  }
}

export async function deleteCollection(id: string): Promise<Result> {
  const g = guard();
  if (!g) return { ok: false, message: messageFor(null) };
  const before = { collections: state.collections, items: state.items };
  setState({ collections: before.collections.filter((c) => c.id !== id), items: before.items.filter((i) => i.collection_id !== id) });
  try {
    const { error } = await supabase.from("study_collections").delete().eq("id", id);
    if (error) {
      if (state.userId === g.userId) setState(before);
      return { ok: false, message: messageFor(error) };
    }
    return { ok: true, value: undefined };
  } catch {
    if (state.userId === g.userId) setState(before);
    return { ok: false, message: messageFor(null) };
  }
}

export async function addItem(collectionId: string, kind: CollectionItemKind, refId: string): Promise<Result> {
  const g = guard();
  if (!g) return { ok: false, message: messageFor(null) };
  const existing = itemsOf(state, collectionId);
  if (existing.some((i) => i.kind === kind && i.ref_id === refId)) return { ok: true, value: undefined };
  if (existing.length >= MAX_ITEMS) return { ok: false, message: messageFor({ code: "54000", message: "item" }) };
  const position = existing.length ? Math.min(100000, existing[existing.length - 1].position + 1) : 0;
  try {
    const { data, error } = await supabase
      .from("study_collection_items")
      .insert({ collection_id: collectionId, kind, ref_id: refId, position })
      .select("id, collection_id, kind, ref_id, position, added_at")
      .single();
    if (error?.code === "23505") {
      void load(g.userId); // already there (another tab): resync
      return { ok: true, value: undefined };
    }
    if (error || !data) return onWriteError(error);
    if (state.userId !== g.userId) return { ok: false, message: messageFor(null) };
    setState({ items: [...state.items, data as StudyCollectionItem] });
    // Only the kind — never which item. analytics.ts: props are fixed labels, never what someone studies.
    track("collections.add", { kind });
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, message: messageFor(null) };
  }
}

export async function removeItem(itemId: string): Promise<Result> {
  const g = guard();
  if (!g) return { ok: false, message: messageFor(null) };
  const before = state.items;
  setState({ items: before.filter((i) => i.id !== itemId) });
  try {
    const { error } = await supabase.from("study_collection_items").delete().eq("id", itemId);
    if (error) {
      if (state.userId === g.userId) setState({ items: before });
      return { ok: false, message: messageFor(error) };
    }
    return { ok: true, value: undefined };
  } catch {
    if (state.userId === g.userId) setState({ items: before });
    return { ok: false, message: messageFor(null) };
  }
}

/** Removes (kind, refId) from one collection, if it is there. */
export async function removeRef(collectionId: string, kind: CollectionItemKind, refId: string): Promise<Result> {
  const item = state.items.find((i) => i.collection_id === collectionId && i.kind === kind && i.ref_id === refId);
  return item ? removeItem(item.id) : { ok: true, value: undefined };
}

/** Moves one item up or down by one place: renumbers the whole collection 0..n-1 in one rpc. */
export async function moveItem(collectionId: string, itemId: string, direction: "up" | "down"): Promise<Result> {
  const g = guard();
  if (!g) return { ok: false, message: messageFor(null) };
  const ordered = itemsOf(state, collectionId);
  const i = ordered.findIndex((x) => x.id === itemId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ordered.length) return { ok: true, value: undefined };
  const next = [...ordered];
  [next[i], next[j]] = [next[j], next[i]];
  const positions = new Map(next.map((x, idx) => [x.id, idx]));
  const before = state.items;
  setState({ items: before.map((x) => (positions.has(x.id) ? { ...x, position: positions.get(x.id)! } : x)) });
  try {
    const { data, error } = await supabase.rpc("reorder_study_collection_items", {
      p_collection_id: collectionId,
      p_item_ids: next.map((x) => x.id),
    });
    if (error || data === 0) {
      if (state.userId === g.userId) setState({ items: before });
      return onWriteError(error ?? { code: "42501" });
    }
    return { ok: true, value: undefined };
  } catch {
    if (state.userId === g.userId) setState({ items: before });
    return { ok: false, message: messageFor(null) };
  }
}

/** Test seam only — lets render tests drive the store without a Supabase session. */
export const __testing = {
  setState: (next: Partial<CollectionsState>) => setState(next),
  markStarted: () => {
    started = true;
  },
  load,
};
