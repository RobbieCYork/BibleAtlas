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
    key: "sinking-peter",
    icon: "🌊",
    title: "Sinking Peter",
    tagline: "Hangman, Matthew 14 style — guess the word before Peter goes under.",
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
          <button key={g.key} type="button" className="game-center-card" onClick={() => onSelectGame(g.key)}>
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
