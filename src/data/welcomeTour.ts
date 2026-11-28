/* ============================================================================
 * "Welcome to Capstone Bible" — every word and every step of the welcome tour.
 *
 * 🚨 ANY CHANGE THAT ADDS, REMOVES, RENAMES OR MOVES A USER-FACING FEATURE UPDATES THIS FILE IN THE
 * SAME CHANGE. See AGENTS.md. Two things hold you to it:
 *   - `tsc -b`: the coverage tables at the foot of this file are keyed by the app's own types, so a
 *     new feature flag, code switch, menu destination, My Notes tab or Articles section does not
 *     compile until it has a step or a written reason for having none.
 *   - scripts/welcome-tour-validate (runs inside `vite build`): menu rows, highlight anchors and the
 *     on-screen wording each step quotes must still exist.
 *   And examples/welcome-tour.mjs in the signed-in harness checks the running app.
 *
 * TYPE IMPORTS ONLY. The validator loads this file by stripping its types, with no bundler.
 * Rendering: components/WelcomeTour.tsx. Who sees it: lib/welcomeTourSeen.ts.
 * ========================================================================== */
import type { IconName } from "../components/Icon";
import type { SectionKey } from "../components/ArticlesPanel";
import type { NotesTab } from "../components/MyNotesPanel";
import type { DestinationKey, PanelKey } from "../components/PanelMenu";
import type * as Features from "../lib/features";
import type { FeatureKey } from "../lib/features";
import type { MobileTabKey } from "../lib/mobileTabs";

/** The `data-tour` attributes a step can ring. Components write `data-tour={TOUR_ANCHORS.x}`; each
 * bottom-bar button writes `data-tour={tabAnchor(key)}`. */
export const TOUR_ANCHORS = {
  menu: "menu",
  account: "account",
  report: "report",
  search: "search",
  bibleControls: "bible-controls",
  listen: "listen",
  map: "map",
  walkBanner: "walk-banner",
} as const;

export const tabAnchor = (key: MobileTabKey): `tab-${MobileTabKey}` => `tab-${key}`;

export type TourAnchor = (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS] | `tab-${MobileTabKey}`;

/** One small picture of a control, drawn with the app's own icon set so it cannot go stale. A `tab`
 * chip takes its icon and name from the bottom bar itself (lib/mobileTabs.tsx). */
export type TourChip = { tab: MobileTabKey } | { icon?: IconName; label: string };

export interface TourWhere {
  path: TourChip[];
  /** Plain words after the chips. A lone `tab` chip needs none: it reads "in the bottom bar", or
   * "Menu → name" when the reader has hidden that button. */
  hint?: string;
}

/** Filled in by the component from the app's own lists, so the names are never typed twice. */
export const TOUR_PLACEHOLDERS = ["translations", "games", "sections", "walk"] as const;
export type TourPlaceholder = (typeof TOUR_PLACEHOLDERS)[number];

/** Things a sentence can wait for that are not feature stages: a migration not yet applied.
 * `twenty_questions_multiplayer`: sql/057 (lib/twentyQuestionsMultiplayer.ts asks). */
export type TourCondition = "twenty_questions_multiplayer";

export interface TourStep {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  /** Sentences added only while this viewer can see their feature — and, with `when`, only while
   * that database step is applied (the component asks; see TourCondition). */
  extras?: { text: string; anyFeature: FeatureKey[]; when?: TourCondition }[];
  /** The step shows only while this viewer can see ALL of these (lib/features.ts decides). */
  features?: FeatureKey[];
  /** ...and at least one of these. */
  anyFeature?: FeatureKey[];
  /** Shows only while a seasonal walk's banner is on screen. */
  seasonal?: boolean;
  phone?: TourWhere;
  desktop?: TourWhere;
  /** What to ring, first one on screen wins. Nothing on screen means no ring. */
  anchors?: { phone: TourAnchor[]; desktop: TourAnchor[] };
  /** On-screen wording this step relies on: `text` must still appear in `src/<file>`. */
  names?: { file: string; text: string }[];
}

const MENU_CHIP: TourChip = { icon: "menu", label: "Menu" };
const ACCOUNT_CHIP: TourChip = { icon: "people", label: "Your initial" };

export const TOUR_STEPS = [
  {
    id: "welcome",
    icon: "bible",
    title: "Welcome to Capstone Bible",
    body: "Here is a quick look at what you can do and where to find it. Skip it whenever you like.",
  },
  {
    id: "bible",
    icon: "bible",
    title: "Read the Bible",
    body: "Tap the chapter name to choose a book and chapter, or use the arrows beside it. You can read the {translations}.",
    phone: { path: [{ tab: "bible" }] },
    desktop: { path: [{ icon: "bible", label: "Bible" }], hint: "the panel on the left" },
    anchors: { phone: ["bible-controls", "tab-bible"], desktop: ["bible-controls"] },
    names: [{ file: "components/BiblePanel.tsx", text: "choose a different book, chapter or verse" }],
  },
  {
    id: "listen",
    icon: "volume",
    title: "Listen",
    body: "Press Listen to hear a chapter read aloud. Audio is available in the World English Bible (WEB).",
    phone: { path: [{ icon: "volume", label: "Listen" }], hint: "above the chapter" },
    desktop: { path: [{ icon: "volume", label: "Listen" }], hint: "above the chapter" },
    anchors: { phone: ["listen", "bible-controls"], desktop: ["listen", "bible-controls"] },
    names: [
      { file: "components/BiblePanel.tsx", text: '<span className="bible-listen-word">Listen</span>' },
      { file: "components/BiblePanel.tsx", text: 'const audioEligible = translation === "web"' },
    ],
  },
  {
    id: "offline",
    icon: "phone",
    title: "Read with no connection",
    body: "Download a translation to read and search it with no connection. Open the version list and choose Download for offline reading, or use Offline Bibles in My Profile.",
    phone: { path: [{ icon: "bible", label: "Version list" }], hint: "above the chapter" },
    desktop: { path: [{ icon: "bible", label: "Version list" }], hint: "above the chapter" },
    anchors: { phone: ["bible-controls", "tab-bible"], desktop: ["bible-controls"] },
    names: [
      { file: "components/BiblePanel.tsx", text: "Download for offline reading…" },
      { file: "components/OfflineBibles.tsx", text: '<span className="auth-settings-label">Offline Bibles</span>' },
    ],
  },
  {
    id: "verses",
    icon: "pencil",
    title: "Highlight, note, tag and share",
    body: "Select words in a verse. Then pick a highlight colour, write a note, add a tag or share the verse.",
    phone: { path: [{ icon: "pencil", label: "Select text" }], hint: "press and hold a word, then drag" },
    desktop: { path: [{ icon: "pencil", label: "Select text" }], hint: "drag across the words" },
    anchors: { phone: ["bible-controls"], desktop: ["bible-controls"] },
    names: [
      { file: "components/BiblePanel.tsx", text: '<span className="verse-popup-btn-label"> Note</span>' },
      { file: "components/BiblePanel.tsx", text: '<span className="verse-popup-btn-label"> Tag</span>' },
      { file: "components/BiblePanel.tsx", text: '<span className="verse-popup-btn-label"> Share</span>' },
    ],
  },
  {
    id: "search",
    icon: "search",
    title: "Search",
    body: "One box finds Bible verses, people, places, topics and events. Type a reference such as John 3:16 to go straight there.",
    phone: { path: [{ icon: "search", label: "Search" }], hint: "at the top, on Bible and Map" },
    desktop: { path: [{ icon: "search", label: "Search" }], hint: "at the top of the screen" },
    anchors: { phone: ["search"], desktop: ["search"] },
    names: [{ file: "components/UnifiedSearchBar.tsx", text: 'placeholder="Search anything..."' }],
  },
  {
    id: "map",
    icon: "map",
    title: "Explore the map",
    body: "See where Bible events happened. Tap a pin to read about it, and switch between Map and Satellite.",
    phone: { path: [{ tab: "map" }] },
    desktop: { path: [MENU_CHIP, { icon: "map", label: "Map" }], hint: "it starts out beside the Bible" },
    anchors: { phone: ["tab-map", "menu"], desktop: ["map", "menu"] },
    names: [{ file: "components/ThenNowToggle.tsx", text: 'label: "Satellite"' }],
  },
  {
    id: "walk",
    icon: "calendar",
    title: "{walk}",
    body: "A seasonal walk is on now. Open it to follow the story stop by stop, with the map and the passages.",
    seasonal: true,
    phone: { path: [{ icon: "calendar", label: "Banner" }], hint: "under the top bar" },
    desktop: { path: [{ icon: "calendar", label: "Banner" }], hint: "under the top bar" },
    anchors: { phone: ["walk-banner"], desktop: ["walk-banner"] },
    names: [{ file: "App.tsx", text: 'className="walk-banner-pill"' }],
  },
  {
    id: "timeline",
    icon: "timeline",
    title: "Travel the Timeline",
    body: "Bible, church and world history side by side. Drag to move through time, or tap Go to and pick a year or an era. Tap an event to read about it.",
    features: ["timeline"],
    phone: { path: [{ tab: "timeline" }] },
    desktop: { path: [MENU_CHIP, { icon: "timeline", label: "Timeline" }] },
    anchors: { phone: ["tab-timeline", "menu"], desktop: ["menu"] },
    names: [{ file: "components/TimelineGoToMenu.tsx", text: '<span className="tl-goto-button-text">Go to</span>' }],
  },
  {
    id: "articles",
    icon: "articles",
    title: "Browse Articles",
    body: "Read about {sections}. Many names in the Bible text are links to these articles.",
    features: ["library_articles"],
    phone: { path: [{ tab: "articles" }] },
    desktop: { path: [MENU_CHIP, { icon: "articles", label: "Articles" }] },
    anchors: { phone: ["tab-articles", "menu"], desktop: ["menu"] },
  },
  {
    id: "religions",
    icon: "globe",
    title: "Religions and Denominations",
    body: "Learn what world religions and Christian denominations believe, and where they differ.",
    features: ["library_articles"],
    phone: { path: [{ tab: "articles" }, { icon: "globe", label: "Religions and Denominations" }] },
    desktop: { path: [{ icon: "articles", label: "Articles" }, { icon: "globe", label: "Religions and Denominations" }] },
    anchors: { phone: ["tab-articles", "menu"], desktop: ["menu"] },
    names: [{ file: "components/ArticlesPanel.tsx", text: 'label: "Religions and Denominations"' }],
  },
  {
    id: "notes",
    icon: "notes",
    title: "My Notes",
    body: "Your verse notes and tagged verses are gathered here. Filter them by book or tag, or export them.",
    phone: { path: [{ tab: "notes" }] },
    desktop: { path: [MENU_CHIP, { icon: "notes", label: "My Notes" }] },
    anchors: { phone: ["tab-notes", "menu"], desktop: ["menu"] },
    names: [
      { file: "components/MyNotesPanel.tsx", text: 'aria-label="Filter by tag"' },
      { file: "components/MyNotesPanel.tsx", text: 'className="my-notes-export-button"' },
    ],
  },
  {
    id: "sermon",
    icon: "church",
    title: "Sermon Notes",
    body: "Take notes during a sermon, with its title, speaker and passage, and keep them all in one place.",
    features: ["sermon_notes"],
    phone: { path: [{ tab: "notes" }, { icon: "church", label: "Sermon Notes" }] },
    desktop: { path: [{ icon: "notes", label: "My Notes" }, { icon: "church", label: "Sermon Notes" }] },
    anchors: { phone: ["tab-notes", "menu"], desktop: ["menu"] },
    names: [{ file: "components/MyNotesPanel.tsx", text: "Sermon Notes" }],
  },
  {
    id: "prayer",
    icon: "heart",
    title: "Prayer List",
    body: "Write down what you are praying for, add updates, and tick each one off when it is answered. Only you can see it.",
    features: ["prayer_list"],
    phone: { path: [{ tab: "notes" }, { icon: "heart", label: "Prayer List" }] },
    desktop: { path: [{ icon: "notes", label: "My Notes" }, { icon: "heart", label: "Prayer List" }] },
    anchors: { phone: ["tab-notes", "menu"], desktop: ["menu"] },
    names: [
      { file: "components/MyNotesPanel.tsx", text: "Prayer List" },
      { file: "components/PrayerListView.tsx", text: "answered" },
    ],
  },
  {
    id: "games",
    icon: "games",
    title: "Games",
    body: "Test and build what you know with {games}.",
    extras: [
      {
        text: "Some can also be played with other people, using a join code.",
        anyFeature: ["game_bible_trivia", "game_saving_peter"],
      },
    ],
    features: ["games_trivia"],
    anyFeature: [
      "game_bible_trivia",
      "game_saving_peter",
      "game_fill_blank",
      "game_memorization",
      "game_chronology",
      "game_daily_name",
      "game_twenty_questions",
    ],
    phone: { path: [{ tab: "games" }] },
    desktop: { path: [MENU_CHIP, { icon: "games", label: "Games" }] },
    anchors: { phone: ["tab-games", "menu"], desktop: ["menu"] },
    names: [{ file: "components/GameEntry.tsx", text: "Join multiplayer game" }],
  },
  {
    id: "daily-name",
    icon: "dailyName",
    title: "Daily Name",
    body: "Guess the day’s hidden Bible name in six tries. Everyone gets the same one, and Practice gives you more.",
    features: ["games_trivia", "game_daily_name"],
    phone: { path: [{ tab: "games" }, { icon: "dailyName", label: "Daily Name" }] },
    desktop: { path: [{ icon: "games", label: "Games" }, { icon: "dailyName", label: "Daily Name" }] },
    anchors: { phone: ["tab-games", "menu"], desktop: ["menu"] },
    names: [
      { file: "components/GameCenter.tsx", text: 'title: "Daily Name"' },
      { file: "components/DailyNameView.tsx", text: '<span className="game-center-card-title">Practice</span>' },
      { file: "lib/dailyName.ts", text: "MAX_GUESSES = 6" },
    ],
  },
  {
    id: "twenty-questions",
    icon: "twentyQuestions",
    title: "20 Questions",
    body: "The app picks a secret person, place or thing from the Bible. Ask yes-or-no questions from a list and find it within twenty.",
    extras: [
      {
        text: "Or play with friends: create a multiplayer game, share the code and take turns asking. The first right guess wins.",
        anyFeature: ["game_twenty_questions"],
        when: "twenty_questions_multiplayer",
      },
    ],
    features: ["games_trivia", "game_twenty_questions"],
    phone: { path: [{ tab: "games" }, { icon: "twentyQuestions", label: "20 Questions" }] },
    desktop: { path: [{ icon: "games", label: "Games" }, { icon: "twentyQuestions", label: "20 Questions" }] },
    anchors: { phone: ["tab-games", "menu"], desktop: ["menu"] },
    names: [
      { file: "components/GameCenter.tsx", text: 'title: "20 Questions"' },
      { file: "components/TwentyQuestionsView.tsx", text: "const TQ_LIMIT = 20;" },
      { file: "lib/twentyQuestionsText.ts", text: 'label: "Things"' },
      { file: "components/TwentyQuestionsMultiplayerView.tsx", text: "<h2>Create multiplayer game</h2>" },
      { file: "components/TwentyQuestionsRoomPlay.tsx", text: "The first right guess wins." },
    ],
  },
  {
    id: "profile",
    icon: "social",
    title: "My Profile",
    body: "Your own page. Edit your details, choose your Bible version and Theme, and download a backup of your data.",
    extras: [{ text: "You can add a photo when you edit it.", anyFeature: ["avatars"] }],
    phone: { path: [{ tab: "social" }] },
    desktop: { path: [ACCOUNT_CHIP, { icon: "social", label: "My Profile" }], hint: "starting at the top right" },
    anchors: { phone: ["tab-social", "menu"], desktop: ["account"] },
    names: [
      { file: "components/MyProfileView.tsx", text: "Download Backup" },
      { file: "components/MyProfileView.tsx", text: 'htmlFor="myprofile-bible-version"' },
      { file: "components/SkinPicker.tsx", text: 'htmlFor="myprofile-theme"' },
      { file: "components/AuthButton.tsx", text: '<Icon name="social" inline /> My Profile' },
    ],
  },
  {
    id: "social",
    icon: "players",
    title: "Friends, Groups and Messages",
    body: "Add friends, start a group, and send messages, all from your profile. Every message, post and profile has a flag control to report it or block the person. Safety & Contact, in the account menu, explains how.",
    phone: { path: [{ tab: "social" }, { icon: "players", label: "Friends" }] },
    desktop: { path: [MENU_CHIP, { icon: "players", label: "Social" }], hint: "starting at the top left" },
    anchors: { phone: ["tab-social", "menu"], desktop: ["menu"] },
    names: [
      { file: "components/MyProfileView.tsx", text: '<Icon name="players" inline /> Friends' },
      { file: "components/MyProfileView.tsx", text: '<Icon name="groups" inline /> Groups' },
      { file: "components/MyProfileView.tsx", text: '<Icon name="messages" inline /> Messages' },
      { file: "components/PanelMenu.tsx", text: 'friends: "Social"' },
      { file: "components/AuthButton.tsx", text: '<Icon name="shield" inline /> Safety &amp; Contact' },
    ],
  },
  {
    id: "reading",
    icon: "check",
    title: "Track your reading",
    body: "Tick the box at the foot of a chapter to mark it as read. My Reading, on your profile, fills in as you go.",
    phone: { path: [{ tab: "social" }, { icon: "check", label: "My Reading" }] },
    desktop: { path: [{ icon: "social", label: "My Profile" }, { icon: "check", label: "My Reading" }] },
    anchors: { phone: ["tab-social", "menu"], desktop: ["account"] },
    names: [
      { file: "components/BiblePanel.tsx", text: "Mark {passage.reference} as read" },
      { file: "components/MyProfileView.tsx", text: "My Reading" },
    ],
  },
  {
    id: "posts",
    icon: "doc",
    title: "Newsfeed and My Posts",
    body: "Newsfeed brings you a verse of the day to reflect on. My Posts is where you write your own.",
    features: ["posts_newsfeed"],
    phone: { path: [{ tab: "social" }, { icon: "doc", label: "Newsfeed" }] },
    desktop: { path: [{ icon: "social", label: "My Profile" }, { icon: "doc", label: "Newsfeed" }] },
    anchors: { phone: ["tab-social", "menu"], desktop: ["account"] },
    names: [
      { file: "components/MyProfileView.tsx", text: "Newsfeed" },
      { file: "components/MyProfileView.tsx", text: "My Posts" },
      { file: "components/Newsfeed.tsx", text: "Verse of the Day" },
    ],
  },
  {
    id: "settings",
    icon: "settings",
    title: "Settings",
    body: "Change the text size, switch between light and dark, and choose when read marks reset. On a phone you can also choose the bottom bar buttons.",
    phone: { path: [ACCOUNT_CHIP, { icon: "settings", label: "Settings" }], hint: "starting at the top right" },
    desktop: { path: [ACCOUNT_CHIP, { icon: "settings", label: "Settings" }], hint: "starting at the top right" },
    anchors: { phone: ["account"], desktop: ["account"] },
    names: [
      { file: "components/AuthButton.tsx", text: '<Icon name="settings" inline /> Settings' },
      { file: "components/AccountSettings.tsx", text: "Text Size" },
      { file: "components/AccountSettings.tsx", text: "Light or dark" },
      { file: "components/AccountSettings.tsx", text: "Navigation Bar" },
      { file: "components/AccountSettings.tsx", text: 'Reset "Read" Marks' },
    ],
  },
  {
    id: "report",
    icon: "flag",
    title: "Report or Suggest",
    body: "Spotted something broken or wrong, or have an idea for a new feature? Tap the flag, then choose Report a problem or Suggest a feature. Follow both under My Reports & Suggestions on your profile.",
    phone: { path: [{ icon: "flag", label: "Report or Suggest" }], hint: "the flag at the top" },
    desktop: { path: [{ icon: "flag", label: "Report or Suggest" }], hint: "the flag at the top" },
    anchors: { phone: ["report"], desktop: ["report"] },
    names: [
      { file: "components/HeaderReportButton.tsx", text: 'aria-label="Report a problem or suggest a feature"' },
      { file: "components/ReportIssueSheet.tsx", text: 'choice: "Report a problem"' },
      { file: "components/ReportIssueSheet.tsx", text: 'choice: "Suggest a feature"' },
      { file: "components/MyProfileView.tsx", text: "My Reports &amp; Suggestions" },
    ],
  },
  {
    id: "about",
    icon: "info",
    title: "About Capstone Bible",
    body: "Read why Capstone Bible was made and what is behind it.",
    phone: { path: [MENU_CHIP, { icon: "info", label: "About Capstone Bible" }], hint: "starting at the top left" },
    desktop: { path: [MENU_CHIP, { icon: "info", label: "About Capstone Bible" }], hint: "starting at the top left" },
    anchors: { phone: ["menu"], desktop: ["menu"] },
    names: [{ file: "data/aboutPage.ts", text: 'ABOUT_TITLE = "About Capstone Bible"' }],
  },
  {
    id: "done",
    icon: "play",
    title: "You’re ready",
    body: "To see this again, choose Welcome tour in the menu or in Settings.",
    phone: { path: [MENU_CHIP, { icon: "play", label: "Welcome tour" }], hint: "starting at the top left" },
    desktop: { path: [MENU_CHIP, { icon: "play", label: "Welcome tour" }], hint: "starting at the top left" },
    anchors: { phone: ["menu"], desktop: ["menu"] },
    names: [
      { file: "components/MobileNavMenu.tsx", text: "Welcome tour" },
      { file: "components/PanelMenu.tsx", text: "Welcome tour" },
      { file: "components/AccountSettings.tsx", text: "Welcome tour" },
    ],
  },
] as const satisfies readonly TourStep[];

export type TourStepId = (typeof TOUR_STEPS)[number]["id"];

/* ============================================================================
 * COVERAGE — every feature and destination names its step, or says why it has none.
 * A compile error here means the app gained, lost or renamed something and the tour has not caught up.
 * ========================================================================== */

export type TourCoverage = TourStepId | { skip: string };

/** Every Testing/Live feature flag (lib/features.ts). */
export const FEATURE_COVERAGE: Record<FeatureKey, TourCoverage> = {
  prayer_list: "prayer",
  sermon_notes: "sermon",
  posts_newsfeed: "posts",
  timeline: "timeline",
  games_trivia: "games",
  library_articles: "articles",
  account_deletion: { skip: "Deleting an account is not something to show a newcomer." },
  avatars: "profile",
  game_bible_trivia: "games",
  game_saving_peter: "games",
  game_fill_blank: "games",
  game_memorization: "games",
  game_chronology: "games",
  game_daily_name: "daily-name",
  game_twenty_questions: "twenty-questions",
};

type CodeSwitch = {
  [K in keyof typeof Features]: (typeof Features)[K] extends boolean ? K : never;
}[keyof typeof Features];

/** Every code-level on/off constant in lib/features.ts. `off` is only accepted while the constant is
 * false: turning one on stops the build until it names a step or a reason to skip. */
export const SWITCH_COVERAGE: {
  [K in CodeSwitch]: (typeof Features)[K] extends false ? { off: string } : TourCoverage;
} = {
  SOCIAL_CONNECTIONS_ENABLED: "social",
  ARCHAEOLOGY_MENU_ROW_VISIBLE: { off: "No menu row; Archaeology is named in the Articles step." },
  READING_PLANS_ENABLED: { off: "Reading Plans are switched off." },
  CUSTOM_MAP_FOR_EVERYONE: { off: "The Custom Map builder is shown to the owner only until it is released, so the tour does not mention it." },
};

/** Every row of the main menus, the bottom bar and the account menu (their `data-menu` values). */
export const MENU_COVERAGE: Record<
  | MobileTabKey
  | PanelKey
  | DestinationKey
  | "archaeology"
  | "tour"
  | "about"
  | "profile"
  | "settings"
  | "reports"
  | "admin"
  | "reading-plans"
  | "report"
  | "safety"
  | "sign-out",
  TourCoverage
> = {
  bible: "bible",
  map: "map",
  timeline: "timeline",
  notes: "notes",
  articles: "articles",
  social: "profile",
  friends: "social",
  games: "games",
  archaeology: "articles",
  tour: "done",
  about: "about",
  profile: "profile",
  settings: "settings",
  reports: { skip: "Advisors only." },
  admin: { skip: "Administrators only." },
  "reading-plans": { skip: "Switched off (READING_PLANS_ENABLED)." },
  report: "report",
  safety: "social",
  "sign-out": { skip: "Needs no explaining." },
};

export const NOTES_TAB_COVERAGE: Record<NotesTab, TourCoverage> = {
  verse: "notes",
  sermon: "sermon",
  prayer: "prayer",
};

export const ARTICLE_SECTION_COVERAGE: Record<SectionKey, TourCoverage> = {
  location: "articles",
  poi: "articles",
  person: "articles",
  topic: "articles",
  archaeology: "articles",
  beliefs: "religions",
  timelineEvent: "articles",
};
