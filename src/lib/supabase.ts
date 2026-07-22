import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface ReadingProgress {
  book: string;
  chapter: number;
  translation: string;
}

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** start_verse === end_verse for a highlight entirely within one verse; a span across verses has
 * start_offset relative to start_verse's text and end_offset relative to end_verse's text — verses
 * strictly between the two are covered in full. */
export interface Highlight {
  id: string;
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  translation: string;
  start_offset: number;
  end_offset: number;
  color: HighlightColor;
}

export interface Note {
  id: string;
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  translation: string;
  quoted_text: string | null;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface VerseTag {
  id: string;
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  translation: string;
  tag_id: string;
  created_at: string;
}
