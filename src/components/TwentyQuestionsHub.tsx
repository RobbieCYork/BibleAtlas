import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import TwentyQuestionsView from "./TwentyQuestionsView";
import TwentyQuestionsMultiplayerView from "./TwentyQuestionsMultiplayerView";
import BackButton from "./BackButton";
import Icon from "./Icon";
import { GameEntryChoices } from "./GameEntry";
import type { OpenGameArticle } from "../lib/gameArticles";
import { TWENTY_Q_ROOM_KEY, useTwentyQMultiplayerEnabled } from "../lib/twentyQuestionsMultiplayer";

interface TwentyQuestionsHubProps {
  session: Session;
  onBack: () => void;
  onOpenArticle?: OpenGameArticle;
  /** False when 20 Questions' stage hides it from this viewer (GameView decides). Solo and this first
   * screen hand straight back; multiplayer hands back once out of any room. */
  available: boolean;
}

type Screen = "home" | "solo" | "create" | "join" | "rejoin";

function seatedRoom(): string | null {
  try {
    return sessionStorage.getItem(TWENTY_Q_ROOM_KEY);
  } catch {
    return null;
  }
}

/** 20 Questions' entry point. Once sql/057 is applied: Play solo / Create multiplayer game / Join
 * multiplayer game, the same first screen as Bible Trivia and Saving Peter. Before it is applied the
 * probe says no, and 20 Questions opens straight on its solo category screen exactly as it always
 * has — there is nothing to choose between. */
export default function TwentyQuestionsHub({ session, onBack, onOpenArticle, available }: TwentyQuestionsHubProps) {
  const multiplayerEnabled = useTwentyQMultiplayerEnabled();
  const [screen, setScreen] = useState<Screen>(() => (seatedRoom() ? "rejoin" : "home"));
  const multiplayer = screen === "create" || screen === "join" || screen === "rejoin";

  useEffect(() => {
    if (!available && !multiplayer) onBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, multiplayer]);

  if (multiplayer)
    return (
      <TwentyQuestionsMultiplayerView
        session={session}
        entry={screen === "rejoin" ? null : screen}
        onBack={() => (available ? setScreen("home") : onBack())}
        onOpenArticle={onOpenArticle}
        available={available}
      />
    );
  if (!available) return null;

  // Still asking whether multiplayer exists: the header alone, for the length of one request.
  if (multiplayerEnabled === null && screen === "home")
    return (
      <div className="game-root" data-page-bg="game-setup">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2 className="games-inline-icon">
            <Icon name="twentyQuestions" />
            20 Questions
          </h2>
        </header>
      </div>
    );

  if (!multiplayerEnabled) return <TwentyQuestionsView onBack={onBack} onOpenArticle={onOpenArticle} />;
  if (screen === "solo")
    return <TwentyQuestionsView onBack={() => setScreen("home")} backLabel="Back to 20 Questions" onOpenArticle={onOpenArticle} />;

  return (
    <div className="game-root" data-page-bg="game-setup">
      <header className="game-header">
        <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
        <h2 className="games-inline-icon">
          <Icon name="twentyQuestions" />
          20 Questions
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
