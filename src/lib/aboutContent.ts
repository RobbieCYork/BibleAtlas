import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { ABOUT_PULL_QUOTE, ABOUT_SECTIONS } from "../data/aboutPage";

/* ============================================================================
 * The words of "About Capstone Bible" — built in, or saved by the owner (sql/051).
 *
 * WHERE THE WORDS COME FROM, IN ORDER
 * ----------------------------------------------------------------------------
 *   1. The row in `about_page`, once the owner has saved one from Admin Console
 *      -> About page. Readable by everyone (anon included).
 *   2. Until that loads: the last saved text this browser saw (localStorage),
 *      so a returning reader does not watch the page change under them.
 *   3. Otherwise, and whenever the read fails for ANY reason — sql/051 not
 *      applied yet, offline, a row in a shape this build cannot render — the
 *      built-in text in src/data/aboutPage.ts. Fail open, silently: a reader
 *      never sees an error for this.
 *
 * The public /about page reads the same row with a few lines of inline script
 * (scripts/seo/render.mjs, aboutLoaderScript) and checks the same shape.
 *
 * RENDERING IS TEXT, NEVER HTML. Every string here ends up in a React text
 * node (or textContent on /about). There is no markup path to escape from.
 * ========================================================================== */

export interface AboutSectionContent {
  /** null = no heading (the opening letter). */
  heading: string | null;
  paragraphs: string[];
}

export interface AboutContent {
  /** "" = no pull quote. */
  quote: string;
  sections: AboutSectionContent[];
}

/** The limits sql/051's about_page_content_ok() enforces. The editor checks them first so the owner
 * gets a plain-English message rather than a database error. Keep the two in step. */
export const ABOUT_LIMITS = {
  quote: 1000,
  heading: 200,
  paragraph: 10000,
  sections: 40,
  paragraphsPerSection: 100,
  bytes: 200000,
} as const;

export const BUILT_IN_ABOUT: AboutContent = {
  quote: ABOUT_PULL_QUOTE,
  sections: ABOUT_SECTIONS.map((s) => ({ heading: s.heading, paragraphs: [...s.paragraphs] })),
};

/** Same rules as about_page_content_ok() in sql/051. Returns the problem in words, or null. */
export function aboutContentProblem(c: unknown): string | null {
  if (!c || typeof c !== "object" || Array.isArray(c)) return "The page is empty.";
  const o = c as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length !== 2 || !("quote" in o) || !("sections" in o)) return "The page is in an unexpected shape.";
  if (typeof o.quote !== "string") return "The pull quote is in an unexpected shape.";
  if (o.quote.length > ABOUT_LIMITS.quote) return `The pull quote is too long (${o.quote.length} of ${ABOUT_LIMITS.quote} characters).`;
  if (!Array.isArray(o.sections) || o.sections.length < 1) return "The page needs at least one section.";
  if (o.sections.length > ABOUT_LIMITS.sections) return `Too many sections (at most ${ABOUT_LIMITS.sections}).`;
  for (let i = 0; i < o.sections.length; i++) {
    const s = o.sections[i] as Record<string, unknown> | null;
    const n = i + 1;
    if (!s || typeof s !== "object" || Array.isArray(s)) return `Section ${n} is in an unexpected shape.`;
    if (Object.keys(s).length !== 2 || !("heading" in s) || !("paragraphs" in s)) return `Section ${n} is in an unexpected shape.`;
    if (s.heading !== null) {
      if (typeof s.heading !== "string" || !s.heading.trim()) return `Section ${n}'s heading is blank. Clear it completely to have no heading.`;
      if (s.heading.length > ABOUT_LIMITS.heading) return `Section ${n}'s heading is too long (at most ${ABOUT_LIMITS.heading} characters).`;
    }
    if (!Array.isArray(s.paragraphs) || s.paragraphs.length < 1) return `Section ${n} has no text. Write something in it, or remove the section.`;
    if (s.paragraphs.length > ABOUT_LIMITS.paragraphsPerSection) return `Section ${n} has too many paragraphs (at most ${ABOUT_LIMITS.paragraphsPerSection}).`;
    for (const p of s.paragraphs) {
      if (typeof p !== "string" || !p.trim()) return `Section ${n} has an empty paragraph.`;
      if (p.length > ABOUT_LIMITS.paragraph) return `A paragraph in section ${n} is too long (at most ${ABOUT_LIMITS.paragraph} characters).`;
    }
  }
  if (new TextEncoder().encode(JSON.stringify(c)).length > ABOUT_LIMITS.bytes) return "The page is too long to save.";
  return null;
}

export const isAboutContent = (c: unknown): c is AboutContent => aboutContentProblem(c) === null;

export const sameAboutContent = (a: AboutContent, b: AboutContent) => JSON.stringify(a) === JSON.stringify(b);

/* --------------------------------------------------------------------------
 * The reader-facing store
 * ------------------------------------------------------------------------ */

const CACHE_KEY = "about-page-cache-v1";

function readCache(): AboutContent | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAboutContent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(c: AboutContent | null) {
  try {
    if (c) localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* Storage blocked or full — the text still shows for this page load. */
  }
}

let current: AboutContent = readCache() ?? BUILT_IN_ABOUT;
const listeners = new Set<() => void>();
const publish = (c: AboutContent) => {
  current = c;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => current;

/** What readers see right now. Re-renders when a load (or the owner's save) changes it. */
export function useAboutContent(): AboutContent {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** A missing table/function: sql/051 is not applied to this database yet. */
export function isMissingAboutSchema(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code);
}

export interface SavedAbout {
  content: AboutContent;
  /** Passed back to save_about_page as p_expected_updated_at, untouched (it carries microseconds). */
  updatedAt: string;
}

export type AboutFetch =
  | { state: "saved"; saved: SavedAbout }
  | { state: "none" } // sql/051 applied, nothing saved: built-in text
  | { state: "unavailable" } // sql/051 not applied
  | { state: "error"; message: string };

/** One read of the saved row. Never throws. */
export async function fetchSavedAbout(): Promise<AboutFetch> {
  try {
    const { data, error } = await supabase.from("about_page").select("content, updated_at").eq("id", 1).maybeSingle();
    if (error) return isMissingAboutSchema(error) ? { state: "unavailable" } : { state: "error", message: error.message };
    if (!data) return { state: "none" };
    const row = data as { content: unknown; updated_at: string };
    if (!isAboutContent(row.content)) return { state: "error", message: "The saved About page is in a shape this version of the app can't show." };
    return { state: "saved", saved: { content: row.content, updatedAt: row.updated_at } };
  } catch (err) {
    return { state: "error", message: err instanceof Error ? err.message : "Couldn't load the About page." };
  }
}

/** Refresh what readers see. Called when About opens. Any failure leaves the current text alone
 * (built-in, or the last saved text this browser saw), except "none", which means the owner has not
 * saved anything and the built-in text is the truth. */
export async function loadAboutContent(): Promise<void> {
  const r = await fetchSavedAbout();
  if (r.state === "saved") {
    writeCache(r.saved.content);
    publish(r.saved.content);
  } else if (r.state === "none" || r.state === "unavailable") {
    writeCache(null);
    publish(BUILT_IN_ABOUT);
  }
}

/* --------------------------------------------------------------------------
 * Owner-only: saving and the version history
 * ------------------------------------------------------------------------ */

export class AboutConflictError extends Error {}

/** save_about_page(). Owner only — the database re-checks. Throws a readable message on refusal,
 * AboutConflictError when the page was saved elsewhere after `expectedUpdatedAt` was loaded. */
export async function saveAboutContent(content: AboutContent, expectedUpdatedAt: string | null, overwrite = false): Promise<SavedAbout> {
  const problem = aboutContentProblem(content);
  if (problem) throw new Error(problem);
  const { data, error } = await supabase.rpc("save_about_page", {
    p_content: content,
    p_expected_updated_at: expectedUpdatedAt,
    p_overwrite: overwrite,
  });
  if (error) {
    if (error.code === "42501") throw new Error("Only the owner can change the About page.");
    if (error.code === "40001") throw new AboutConflictError("The About page was saved somewhere else (another tab or device) after you opened it.");
    if (isMissingAboutSchema(error)) throw new Error("Saving isn't switched on yet: the database change (sql/051) hasn't been applied.");
    if (error.code === "22023") throw new Error("The database refused that text as not in the right shape. Nothing was saved.");
    throw new Error(error.message);
  }
  const row = data as { content: unknown; updated_at: string } | null;
  const saved: SavedAbout = {
    content: row && isAboutContent(row.content) ? row.content : content,
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
  writeCache(saved.content);
  publish(saved.content);
  return saved;
}

export interface AboutVersion {
  id: number;
  content: AboutContent;
  savedAt: string;
}

/** Every saved version, newest first. Owner only (RLS returns nothing to anyone else). */
export async function fetchAboutVersions(limit = 30): Promise<AboutVersion[]> {
  const { data, error } = await supabase
    .from("about_page_versions")
    .select("id, content, saved_at")
    .order("saved_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingAboutSchema(error)) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as { id: number; content: unknown; saved_at: string }[])
    .filter((r) => isAboutContent(r.content))
    .map((r) => ({ id: r.id, content: r.content as AboutContent, savedAt: r.saved_at }));
}

/* --------------------------------------------------------------------------
 * Editing helpers: a section's paragraphs are edited as one box of text, one paragraph per line.
 * ------------------------------------------------------------------------ */

/** Paragraphs -> the editor's text box: a blank line between paragraphs, so it reads like the page. */
export const paragraphsToText = (paragraphs: string[]) => paragraphs.join("\n\n");

/** The editor's text box -> paragraphs. Every line break starts a new paragraph (one or several in a
 * row — a phone keyboard's Return is one), and blank paragraphs are dropped. */
export const textToParagraphs = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
