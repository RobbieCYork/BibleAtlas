import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

interface GameEntryChoicesProps {
  onSolo: () => void;
  /** Left out for a game with no multiplayer, whose first screen is then Play solo alone. */
  multiplayer?: { onCreate: () => void; onJoin: () => void };
}

/** The first screen of every game: how to play, and nothing else. Topic, difficulty and the like
 * come after Play solo or Create multiplayer game; Join goes straight to the code. */
export function GameEntryChoices({ onSolo, multiplayer }: GameEntryChoicesProps) {
  const choice = (icon: IconName, title: string, onClick: () => void) => (
    <button type="button" className="game-center-card game-entry-card" onClick={onClick}>
      <span className="game-center-card-icon">
        <Icon name={icon} />
      </span>
      <span className="game-center-card-body">
        <span className="game-center-card-title">{title}</span>
      </span>
      <span className="game-center-card-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
  return (
    <div className="game-center-list">
      {choice("people", "Play solo", onSolo)}
      {multiplayer && choice("players", "Create multiplayer game", multiplayer.onCreate)}
      {multiplayer && choice("link", "Join multiplayer game", multiplayer.onJoin)}
    </div>
  );
}

interface LevelOption<K extends string> {
  key: K;
  label: string;
  description: string;
  icon: IconName;
}

interface LevelSetupProps<K extends string> {
  /** Groups the radios — one name per game. */
  name: string;
  levels: LevelOption<K>[];
  value: K;
  onChange: (level: K) => void;
  onStart: () => void;
  /** Choices drawn above the difficulty in the same card, e.g. Chronology's category. */
  children?: ReactNode;
}

/** Difficulty choice and the one button that starts a solo game. Native radios drawn as cards, so
 * arrow keys and screen readers work unchanged. */
export function LevelSetup<K extends string>({ name, levels, value, onChange, onStart, children }: LevelSetupProps<K>) {
  return (
    <form
      className="games-panel-card game-level-setup"
      onSubmit={(e) => {
        e.preventDefault();
        onStart();
      }}
    >
      {children}
      <fieldset className="games-difficulty">
        <legend>Choose a difficulty</legend>
        <div className="game-center-list">
          {levels.map((l) => (
            <label key={l.key} className={`game-center-card game-level-option${value === l.key ? " is-selected" : ""}`}>
              <input type="radio" name={name} value={l.key} checked={value === l.key} onChange={() => onChange(l.key)} />
              <span className="game-center-card-icon">
                <Icon name={l.icon} />
              </span>
              <span className="game-center-card-body">
                <span className="game-center-card-title">{l.label}</span>
                <span className="game-center-card-tagline">{l.description}</span>
              </span>
              <span className="game-level-check" aria-hidden="true">
                {value === l.key && <Icon name="check" />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="games-primary-button game-start-button">
        <Icon name="play" inline /> Start game
      </button>
    </form>
  );
}

interface JoinByCodeProps {
  code: string;
  onCodeChange: (code: string) => void;
  onJoin: () => void;
  busy: boolean;
  error: string | null;
}

/** Join multiplayer game: the room code and its button, with no options. */
export function JoinByCode({ code, onCodeChange, onJoin, busy, error }: JoinByCodeProps) {
  return (
    <div className="games-panel">
      <div className="games-panel-card">
        <h3>Join multiplayer game</h3>
        <p>Enter the code the host shared with you.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onJoin();
          }}
        >
          <input
            type="text"
            className="games-code-input"
            aria-label="Room code"
            placeholder="ABC123"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoFocus
            disabled={busy}
          />
          <button type="submit" className="games-primary-button game-start-button" disabled={busy || !code.trim()}>
            {busy ? "Joining…" : "Join game"}
          </button>
        </form>
        {error && <p className="games-error">{error}</p>}
      </div>
    </div>
  );
}
