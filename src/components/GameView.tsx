import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GameCenter from "./GameCenter";
import BibleTriviaView from "./BibleTriviaView";
import CrosswordView from "./CrosswordView";
import "./Game.css";

const ACTIVE_GAME_KEY = "bible-atlas-active-game-key";

interface GameViewProps {
  session: Session;
  onClose: () => void;
}

/** Full-screen "Games" takeover — same pattern as TimelineView/MyProfileView (a boolean in App.tsx
 * renders this over the whole app body; the map/Bible layout underneath stays mounted). A thin router:
 * GameCenter is the landing list; each selected game owns its own header/back-button/state entirely
 * (BibleTriviaView, CrosswordView) and hands back to GameCenter via onBack when done, rather than this
 * component needing to know anything about a given game's internals. */
export default function GameView({ session, onClose }: GameViewProps) {
  // Which game's flow is showing — null means GameCenter itself. Persisted so a page refresh mid-game
  // doesn't strand the player on GameCenter while their game (or trivia room) lives on.
  const [activeGame, setActiveGame] = useState<string | null>(() => sessionStorage.getItem(ACTIVE_GAME_KEY));

  const selectGame = (key: string) => {
    setActiveGame(key);
    sessionStorage.setItem(ACTIVE_GAME_KEY, key);
  };
  const backToCenter = () => {
    setActiveGame(null);
    sessionStorage.removeItem(ACTIVE_GAME_KEY);
  };

  if (activeGame === "bible-trivia") return <BibleTriviaView session={session} onBack={backToCenter} />;
  if (activeGame === "crossword") return <CrosswordView onBack={backToCenter} />;

  return (
    <div className="game-root">
      <header className="game-header">
        <button type="button" className="game-back-btn" onClick={onClose} aria-label="Close Games">
          ← Back
        </button>
        <h2>🎮 Game Center</h2>
      </header>
      <div className="game-body">
        <GameCenter onSelectGame={selectGame} />
      </div>
    </div>
  );
}
