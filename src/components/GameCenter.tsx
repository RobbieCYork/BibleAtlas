import { track } from "../lib/analytics";
import Icon, { type IconName } from "./Icon";

export interface GameDef {
  key: string;
  /** A name from components/Icon.tsx, not a glyph — so this table stays plain data and the
   * drawing lives in one place. */
  icon: IconName;
  title: string;
  tagline: string;
}

/** The list of playable games — structured as a list from the start so adding another is just
 * another array entry, not a redesign. */
export const GAMES: GameDef[] = [
  {
    key: "bible-trivia",
    icon: "trivia",
    title: "Bible Trivia",
    tagline: "Live multiplayer trivia with video chat — every player answers, first correct doubles.",
  },
  {
    key: "crossword",
    icon: "crossword",
    title: "Bible Crossword",
    tagline: "Solo crossword puzzles from Beginner (little ones) to Expert (pastors & Bible students).",
  },
  {
    key: "saving-peter",
    icon: "savingPeter",
    title: "Saving Peter",
    tagline: "Hangman, Matthew 14 style — solo, or up to 4 players live with video chat.",
  },
  {
    key: "fill-blank",
    icon: "fillBlank",
    title: "Fill in the Blank",
    tagline: "Standout OT & NT verses with words missing — beat the clock, you get 3 lives.",
  },
  {
    key: "memorization",
    icon: "memorization",
    title: "Scripture Memorization Challenge",
    tagline: "Pick a verse from 100 and learn it word by word — then recite everything you know before the next one.",
  },
  {
    key: "punchline",
    icon: "punchline",
    title: "Guess the Punchline",
    tagline: "Over 100 clean Bible jokes — you get the setup, pick the punchline that really belongs to it.",
  },
  {
    key: "chronology",
    icon: "chronology",
    title: "Chronology",
    tagline: "Put events from the timeline back in the order they happened — Beginner to Expert.",
  },
];

interface GameCenterProps {
  onSelectGame: (key: string) => void;
}

/** The landing screen for Games mode — a list of playable games. Selecting one hands off to that
 * game's own flow (see GameView); its own "Back" then returns here rather than closing Games mode
 * outright, so browsing between games doesn't require re-entering from the main app each time. */
export default function GameCenter({ onSelectGame }: GameCenterProps) {
  return (
    <div className="game-center">
      <div className="games-panel-intro">
        <h2>Game Center</h2>
        <p>Pick a game to play with friends.</p>
      </div>
      <div className="game-center-list">
        {GAMES.map((g) => (
          <button
            key={g.key}
            type="button"
            className="game-center-card"
            onClick={() => {
              // Which games get picked — the game's own fixed key, nothing else.
              track("game.play", { game: g.key });
              onSelectGame(g.key);
            }}
          >
            <span className="game-center-card-icon">
              <Icon name={g.icon} />
            </span>
            <span className="game-center-card-body">
              <span className="game-center-card-title">{g.title}</span>
              <span className="game-center-card-tagline">{g.tagline}</span>
            </span>
            <span className="game-center-card-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
