import { track } from "../lib/analytics";

export interface GameDef {
  key: string;
  icon: string;
  title: string;
  tagline: string;
}

/** The list of playable games — structured as a list from the start so adding another is just
 * another array entry, not a redesign. */
export const GAMES: GameDef[] = [
  {
    key: "bible-trivia",
    icon: "📖",
    title: "Bible Trivia",
    tagline: "Live multiplayer trivia with video chat — every player answers, first correct doubles.",
  },
  {
    key: "crossword",
    icon: "🧩",
    title: "Bible Crossword",
    tagline: "Solo crossword puzzles from Beginner (little ones) to Expert (pastors & Bible students).",
  },
  {
    key: "saving-peter",
    icon: "🌊",
    title: "Saving Peter",
    tagline: "Hangman, Matthew 14 style — solo, or up to 4 players live with video chat.",
  },
  {
    key: "fill-blank",
    icon: "✍️",
    title: "Fill in the Blank",
    tagline: "Standout OT & NT verses with words missing — beat the clock, you get 3 lives.",
  },
  {
    key: "memorization",
    icon: "📿",
    title: "Scripture Memorization Challenge",
    tagline: "Pick a verse from 100 and learn it word by word — then recite everything you know before the next one.",
  },
  {
    key: "punchline",
    icon: "😄",
    title: "Guess the Punchline",
    tagline: "Over 100 clean Bible jokes — you get the setup, pick the punchline that really belongs to it.",
  },
  {
    key: "chronology",
    icon: "⏳",
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
            <span className="game-center-card-icon" aria-hidden="true">
              {g.icon}
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
