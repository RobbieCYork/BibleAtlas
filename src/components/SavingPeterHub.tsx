import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import SavingPeterView from "./SavingPeterView";
import SavingPeterMultiplayerView from "./SavingPeterMultiplayerView";
import BackButton from "./BackButton";
import Icon from "./Icon";

interface SavingPeterHubProps {
  session: Session;
  onBack: () => void;
}

/** Saving Peter's own entry point — choose Solo (the original single-player hangman) or Multiplayer
 * (up to 4 players with video chat, race to answer). Mirrors GameView's own thin-router pattern one
 * level down, so GameView itself doesn't need to know Saving Peter has two modes. */
export default function SavingPeterHub({ session, onBack }: SavingPeterHubProps) {
  const [mode, setMode] = useState<"pick" | "solo" | "multiplayer">("pick");

  if (mode === "solo") return <SavingPeterView session={session} onBack={() => setMode("pick")} />;
  if (mode === "multiplayer") return <SavingPeterMultiplayerView session={session} onBack={() => setMode("pick")} />;

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
        <h2 className="games-inline-icon">
          <Icon name="savingPeter" />
          Saving Peter
        </h2>
      </header>
      <div className="game-body">
        <div className="games-panel-intro">
          <h2>Choose how to play</h2>
          <p>Classic solo hangman, or race up to 3 friends with video chat to answer first.</p>
        </div>
        <div className="game-center-list">
          <button type="button" className="game-center-card" onClick={() => setMode("solo")}>
            <span className="game-center-card-icon" aria-hidden="true">
              <Icon name="people" />
            </span>
            <span className="game-center-card-body">
              <span className="game-center-card-title">Solo</span>
              <span className="game-center-card-tagline">Guess letters before Peter goes under.</span>
            </span>
            <span className="game-center-card-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button type="button" className="game-center-card" onClick={() => setMode("multiplayer")}>
            <span className="game-center-card-icon" aria-hidden="true">
              <Icon name="players" />
            </span>
            <span className="game-center-card-body">
              <span className="game-center-card-title">Multiplayer (up to 4, video chat)</span>
              <span className="game-center-card-tagline">Live video with friends — first correct guess scores, wrong guesses cost you. First to 50 wins.</span>
            </span>
            <span className="game-center-card-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
