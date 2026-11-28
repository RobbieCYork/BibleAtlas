import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import SavingPeterView from "./SavingPeterView";
import SavingPeterMultiplayerView, { SAVING_PETER_ROOM_KEY } from "./SavingPeterMultiplayerView";
import BackButton from "./BackButton";
import Icon from "./Icon";
import { GameEntryChoices } from "./GameEntry";

interface SavingPeterHubProps {
  session: Session;
  onBack: () => void;
  /** False when Saving Peter's stage hides it from this viewer (GameView decides, via useFeature).
   * Solo and this first screen hand straight back; multiplayer hands back once out of any room. */
  available: boolean;
}

/** "rejoin" is a room this tab was already seated in: straight back into it, with the first screen
 * behind it once it is left. */
type Screen = "home" | "solo" | "create" | "join" | "rejoin";

/** Saving Peter's own entry point — play solo (the single-player hangman), or create or join a
 * multiplayer game (up to 4 players with video chat, race to answer). Mirrors GameView's own
 * thin-router pattern one level down, so GameView doesn't need to know Saving Peter has two modes. */
export default function SavingPeterHub({ session, onBack, available }: SavingPeterHubProps) {
  const [screen, setScreen] = useState<Screen>(() => (sessionStorage.getItem(SAVING_PETER_ROOM_KEY) ? "rejoin" : "home"));
  const multiplayer = screen === "create" || screen === "join" || screen === "rejoin";

  useEffect(() => {
    if (!available && !multiplayer) onBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, multiplayer]);

  if (multiplayer)
    return (
      <SavingPeterMultiplayerView
        session={session}
        entry={screen === "rejoin" ? null : screen}
        onBack={() => (available ? setScreen("home") : onBack())}
        available={available}
      />
    );
  if (!available) return null;
  if (screen === "solo") return <SavingPeterView session={session} onBack={() => setScreen("home")} />;

  return (
    <div className="game-root" data-page-bg="game-setup">
      <header className="game-header">
        <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
        <h2 className="games-inline-icon">
          <Icon name="savingPeter" />
          Saving Peter
        </h2>
      </header>
      <div className="game-body">
        <GameEntryChoices
          onSolo={() => setScreen("solo")}
          multiplayer={{ onCreate: () => setScreen("create"), onJoin: () => setScreen("join") }}
        />
      </div>
    </div>
  );
}
