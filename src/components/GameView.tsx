import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GameCenter from "./GameCenter";
import BibleTriviaView from "./BibleTriviaView";
import CrosswordView from "./CrosswordView";
import BackButton from "./BackButton";
import "./Game.css";

const ACTIVE_GAME_KEY = "bible-atlas-active-game-key";

interface GameViewProps {
  session: Session;
  onClose: () => void;
  /** Bumped by App.tsx when the Games nav entry point is tapped while Games mode is ALREADY showing —
   * treated the same way re-tapping an already-active tab returns to that tab's root in many apps:
   * jump back to Game Center instead of silently doing nothing (which is what used to happen, since
   * activeGame lives here, not in App.tsx, so App.tsx alone has no way to reset it). */
  gameCenterNonce: number;
}

/** Full-screen "Games" takeover — same pattern as TimelineView/MyProfileView (a boolean in App.tsx
 * renders this over the whole app body; the map/Bible layout underneath stays mounted). A thin router:
 * GameCenter is the landing list; each selected game owns its own header/back-button/state entirely
 * (BibleTriviaView, CrosswordView) and hands back to GameCenter via onBack when done, rather than this
 * component needing to know anything about a given game's internals. */
export default function GameView({ session, onClose, gameCenterNonce }: GameViewProps) {
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

  // Only react on an actual CHANGE to the nonce, not its initial value on mount — otherwise Games
  // mode would jump to Game Center the instant it opens, discarding whatever game was resumed above.
  const prevNonceRef = useRef(gameCenterNonce);
  useEffect(() => {
    if (gameCenterNonce !== prevNonceRef.current) {
      prevNonceRef.current = gameCenterNonce;
      backToCenter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCenterNonce]);

  if (activeGame === "bible-trivia") return <BibleTriviaView session={session} onBack={backToCenter} />;
  if (activeGame === "crossword") return <CrosswordView onBack={backToCenter} />;

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={onClose} ariaLabel="Close Games" />
        <h2>Game Center</h2>
      </header>
      <div className="game-body">
        <GameCenter onSelectGame={selectGame} />
      </div>
    </div>
  );
}
