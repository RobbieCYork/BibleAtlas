/** Default table contents. Keep these small and boring; checks that need more override per run. */
/** The feature_release rows production holds. game_punchline's game was removed from the app but its
 * row (sql/040) is still in the database, so it stays here: the app must ignore it. */
export const FEATURE_KEYS = [
  "prayer_list", "sermon_notes", "posts_newsfeed", "timeline", "games_trivia", "library_articles", "account_deletion", "avatars",
  "game_bible_trivia", "game_saving_peter", "game_fill_blank", "game_memorization", "game_punchline", "game_chronology",
];

export function defaultTables(me) {
  const now = "2026-10-01T00:00:00Z";
  return {
    feature_release: FEATURE_KEYS.map((feature) => ({ feature, live: true, updated_at: null, updated_by: null })),
    feature_release_log: [],
    profiles: me
      ? [{ id: me.id, display_name: me.name, role: me.role ?? "user", discoverable: true, avatar_url: null, created_at: now }]
      : [],
    admin_users: me?.admin ? [{ user_id: me.id, note: "harness" }] : [],
    reading_progress: [],
    chapter_reads: [],
    article_reads: [],
    // sql/051, applied with nothing saved yet: every reader gets the built-in About text. A check for
    // "not applied" uses setTableError("about_page", { status: 404, code: "PGRST205" }).
    about_page: [],
    about_page_versions: [],
    notes: [], highlights: [], tags: [], verse_tags: [], posts: [], post_comments: [], note_comments: [],
    friend_requests: [], messages: [], groups: [], group_members: [], group_messages: [], group_join_requests: [],
    prayer_items: [], sermon_notes: [], reading_plan_progress: [], profile_links: [], content_hides: [],
    churches: [], church_members: [], church_sermons: [], reports: [], report_categories: [], moderation_reasons: [],
  };
}
