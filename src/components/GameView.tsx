import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GameCenter from "./GameCenter";
import BibleTriviaView from "./BibleTriviaView";
import CrosswordView from "./CrosswordView";
import SavingPeterHub from "./SavingPeterHub";
import FillBlankView from "./FillBlankView";
import MemorizationView from "./MemorizationView";
import BackButton from "./BackButton";
import "./Game.css";

interface GameViewProps {
  session: Session;
  onClose: () => void;
  /** Bumped by App.tsx when the Games nav entry point is tapped while Games mode is ALREADY showing —
   * treated the same way re-tapping an already-active tab returns to that tab's root in many apps:
   * jump back to Game Center instead of silently doing nothing. */
  gameCenterNonce: number;
}

/** Full-screen "Games" takeover — same pattern as TimelineView/MyProfileView (a boolean in App.tsx
 * renders this over the whole app body; the map/Bible layout underneath stays mounted). A thin router:
 * GameCenter is the landing list; each selected game owns its own header/back-button/state entirely
 * (BibleTriviaView, CrosswordView) and hands back to GameCenter via onBack when done, rather than this
 * component needing to know anything about a given game's internals.
 *
 * Always starts at Game Center on mount (no persisted "resume where I left off") — App.tsx already
 * closes Games mode (unmounting this) the moment the reader taps any other nav tab, so the only way
 * back in is deliberately tapping Games again, and that should land on the list, not silently drop
 * them back into whatever they were playing before they navigated away. */
export default function GameView({ session, onClose, gameCenterNonce }: GameViewProps) {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const selectGame = (key: string) => setActiveGame(key);
  const backToCenter = () => setActiveGame(null);

  // Only react on an actual CHANGE to the nonce, not its initial value on mount — otherwise Games
  // mode would jump to Game Center a second, redundant time right as it opens.
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
  if (activeGame === "saving-peter") return <SavingPeterHub session={session} onBack={backToCenter} />;
  if (activeGame === "fill-blank") return <FillBlankView onBack={backToCenter} />;
  if (activeGame === "memorization") return <MemorizationView onBack={backToCenter} />;

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
