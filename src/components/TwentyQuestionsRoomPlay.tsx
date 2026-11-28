import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TQ_SETS, type TQAnswer } from "../data/twentyQuestions";
import { TQ_VERSES } from "../data/twentyQuestionsVerses";
import type { OpenGameArticle } from "../lib/gameArticles";
import {
  askTwentyQ,
  guessTwentyQ,
  passTwentyQTurn,
  TWENTY_Q_MAX_PLAYERS,
  type TwentyQMove,
  type TwentyQPlayer,
  type TwentyQRoom,
} from "../lib/twentyQuestionsMultiplayer";
import { ANSWER_ICON, ANSWER_LABEL, inSentence } from "../lib/twentyQuestionsText";
import { ResultsWinnerPictures } from "./GameResultsStandings";
import { useFinalStandings } from "../hooks/useFinalStandings";
import Icon from "./Icon";

interface TwentyQuestionsRoomPlayProps {
  room: TwentyQRoom;
  players: TwentyQPlayer[];
  moves: TwentyQMove[];
  userId: string;
  renderVideoStrip: () => ReactNode;
  /** Leaves the finished room, back to the create / join step. */
  onPlayAgain: () => void;
  onOpenArticle?: OpenGameArticle;
  /** The room row an rpc just returned — shown at once rather than waiting for Realtime. */
  onRoomChanged: (room: TwentyQRoom) => void;
}

/** Grace after a turn's time is up before another player's device passes it, so a move sent in the
 * last second still lands. The server decides from its own clock; an early call is just refused. */
const TIMEOUT_GRACE_MS = 1_500;
const TIMEOUT_RETRY_MS = 3_000;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** One game of 20 Questions with friends, from the first turn to the reveal. The secret is never on
 * this device until the server sets revealed_entry_id; every answer below is a row the server wrote. */
export default function TwentyQuestionsRoomPlay({
  room,
  players,
  moves,
  userId,
  renderVideoStrip,
  onPlayAgain,
  onOpenArticle,
  onRoomChanged,
}: TwentyQuestionsRoomPlayProps) {
  const set = TQ_SETS[room.category];
  const active = room.status === "active";
  const myTurn = active && room.turn_user_id === userId;
  const finalRound = room.final_from_seq !== null;
  const left = Math.max(0, room.question_limit - room.questions_used);

  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("All");
  const [guessing, setGuessing] = useState(false);
  const [guessSearch, setGuessSearch] = useState("");
  const [guessPick, setGuessPick] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);

  // A new turn starts clean.
  useEffect(() => {
    setBusy(false);
    setError(null);
    setGuessing(false);
    setGuessPick(null);
    setGuessSearch("");
  }, [room.turn_no]);

  const startedAt = room.turn_started_at ? new Date(room.turn_started_at).getTime() : now;
  const msLeft = room.turn_seconds * 1000 - (now - startedAt);
  const secondsLeft = Math.max(0, Math.ceil(msLeft / 1000));

  // Someone else's turn ran out: pass it for them, so an absent player cannot stall the room. Every
  // device in the room may try; the server moves the turn once (pass_twenty_q_turn names turn_no).
  const timeoutTried = useRef<number | null>(null);
  const othersTurnOver = active && !myTurn && room.turn_user_id !== null && msLeft <= -TIMEOUT_GRACE_MS;
  useEffect(() => {
    if (!othersTurnOver || timeoutTried.current === room.turn_no) return;
    timeoutTried.current = room.turn_no;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      if (cancelled) return;
      passTwentyQTurn(room.id, room.turn_no)
        .then((r) => {
          if (!cancelled) onRoomChanged(r);
        })
        .catch(() => {
          if (!cancelled) timer = setTimeout(attempt, TIMEOUT_RETRY_MS);
        });
    };
    attempt();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [othersTurnOver, room.id, room.turn_no]);

  const asked = useMemo(() => new Set(moves.filter((m) => m.kind === "question").map((m) => m.item_id)), [moves]);
  const guessed = useMemo(() => new Set(moves.filter((m) => m.kind === "guess").map((m) => m.item_id)), [moves]);

  const available = useMemo(() => {
    const q = norm(search.trim());
    return set.questions.filter((x) => !asked.has(x.id) && (group === "All" || x.group === group) && (!q || norm(x.text).includes(q)));
  }, [set, asked, search, group]);

  const guessList = useMemo(() => {
    const q = norm(guessSearch.trim());
    return [...set.entries].sort((a, b) => a.name.localeCompare(b.name)).filter((e) => !q || norm(e.name).includes(q));
  }, [set, guessSearch]);

  const nameOf = (uid: string | null) =>
    uid === userId ? "You" : (players.find((p) => p.user_id === uid)?.display_name ?? moves.find((m) => m.user_id === uid)?.display_name ?? "A player");
  const entryName = (id: string | null) => set.entries.find((e) => e.id === id)?.name ?? id ?? "";

  const run = async (fn: () => Promise<TwentyQRoom>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onRoomChanged(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't go through — try again.");
      setBusy(false);
    }
  };
  const ask = (qid: string) => run(() => askTwentyQ(room.id, qid));
  const guess = (eid: string) => run(() => guessTwentyQ(room.id, eid));
  const pass = () => run(() => passTwentyQTurn(room.id, room.turn_no));

  const moveText = (m: TwentyQMove) => {
    if (m.kind === "question") return set.questions.find((q) => q.id === m.item_id)?.text ?? m.item_id ?? "";
    if (m.kind === "guess") return `Is it ${inSentence(entryName(m.item_id))}?`;
    if (m.kind === "pass") return "Passed.";
    return "Ran out of time.";
  };
  const who = (m: TwentyQMove) => (m.user_id === userId ? "You" : m.display_name);

  const last = moves[moves.length - 1];
  const lastLine = last
    ? last.kind === "question" || last.kind === "guess"
      ? `${who(last)}: ${moveText(last)} ${ANSWER_LABEL[(last.answer ?? "no") as TQAnswer]}.`
      : `${who(last)}: ${moveText(last)}`
    : null;

  const history = (
    <section className="tq-history" aria-labelledby="tq-history-heading">
      <h3 id="tq-history-heading">Asked so far</h3>
      {moves.length === 0 ? (
        <p className="tq-empty">Nothing yet.</p>
      ) : (
        <ol className="tq-history-list">
          {moves.map((m, i) => (
            <li key={m.seq} className={`tq-turn${m.kind === "guess" ? " tq-turn-guess" : ""}${m.kind === "pass" || m.kind === "timeout" ? " tq-turn-skip" : ""}`}>
              <span className="tq-turn-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="tq-turn-text">
                <span className="tq-turn-who">{who(m)}</span>
                {moveText(m)}
              </span>
              {m.answer && (
                <span className={`tq-answer tq-answer-${m.answer}`}>
                  <span aria-hidden="true">{ANSWER_ICON[m.answer]}</span> {ANSWER_LABEL[m.answer]}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  if (room.status === "finished") {
    return (
      <TwentyQReveal room={room} players={players} userId={userId} onPlayAgain={onPlayAgain} onOpenArticle={onOpenArticle}>
        {history}
      </TwentyQReveal>
    );
  }

  const turnName = nameOf(room.turn_user_id);
  const order = players.map((p) => p.user_id);

  return (
    <div className="game-room-play tq-room">
      {renderVideoStrip()}

      <div className="tq-hud">
        <span className="tq-hud-cat">
          Secret {set.noun} · {set.label}
        </span>
        <span className={`tq-hud-left${left <= 3 ? " tq-hud-low" : ""}`}>
          {finalRound ? "No questions left — one final guess each" : `${left} of ${room.question_limit} questions left`}
        </span>
      </div>
      <div className="tq-meter" aria-hidden="true">
        <span style={{ width: `${(left / room.question_limit) * 100}%` }} />
      </div>

      <div className={`tq-turn-banner${myTurn ? " is-mine" : ""}`} role="status" aria-live="polite">
        <span className="tq-turn-banner-text">
          {myTurn
            ? finalRound
              ? "Your final guess."
              : "Your turn — ask a question or make a guess."
            : room.turn_user_id
              ? `${turnName}'s turn${finalRound ? " — final guess" : ""}.`
              : "Waiting…"}
        </span>
        {room.turn_user_id && (
          <span className={`tq-turn-timer${secondsLeft <= 10 ? " is-low" : ""}`} aria-label={`${secondsLeft} seconds left`}>
            ⏱ {secondsLeft}s
          </span>
        )}
      </div>
      {order.length > 1 && (
        <ol className="tq-order" aria-label="Turn order">
          {order.map((uid) => (
            <li key={uid} className={uid === room.turn_user_id ? "is-current" : ""} aria-current={uid === room.turn_user_id ? "true" : undefined}>
              {nameOf(uid)}
            </li>
          ))}
        </ol>
      )}

      {error && <p className="games-error">{error}</p>}

      {history}

      {myTurn && (
        <section className="tq-guess" aria-labelledby="tq-guess-heading">
          {!guessing && !finalRound ? (
            <div className="tq-turn-actions">
              <button type="button" className="games-primary-button tq-guess-open" onClick={() => setGuessing(true)} disabled={busy}>
                <Icon name="target" inline /> Make a guess
              </button>
              <button type="button" className="games-secondary-button tq-pass" onClick={pass} disabled={busy}>
                Pass
              </button>
            </div>
          ) : (
            <div className="games-panel-card tq-guess-card">
              <h3 id="tq-guess-heading">{finalRound ? "Your final guess" : `Guess the ${set.noun}`}</h3>
              {!finalRound && <p className="tq-note">A wrong guess uses one of the room's questions.</p>}
              <input
                type="search"
                className="tq-search"
                placeholder={`Search ${set.entries.length} ${set.label.toLowerCase()}…`}
                aria-label={`Search ${set.label.toLowerCase()} to guess`}
                value={guessSearch}
                onChange={(e) => setGuessSearch(e.target.value)}
              />
              <ul className="tq-guess-list" role="listbox" aria-label={`${set.label} to guess from`}>
                {guessList.length === 0 && <li className="tq-empty">No match.</li>}
                {guessList.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={guessPick === e.id}
                      className={`tq-guess-option${guessPick === e.id ? " is-selected" : ""}`}
                      disabled={guessed.has(e.id)}
                      onClick={() => setGuessPick(e.id)}
                    >
                      {e.name}
                      {guessed.has(e.id) && <span className="tq-guessed"> — already guessed</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="tq-guess-actions">
                <button type="button" className="games-primary-button" disabled={!guessPick || busy} onClick={() => guessPick && guess(guessPick)}>
                  {guessPick ? `Guess: ${entryName(guessPick)}` : "Pick one to guess"}
                </button>
                {finalRound ? (
                  <button type="button" className="games-secondary-button" onClick={pass} disabled={busy}>
                    Pass
                  </button>
                ) : (
                  <button
                    type="button"
                    className="games-secondary-button"
                    onClick={() => {
                      setGuessing(false);
                      setGuessPick(null);
                    }}
                  >
                    Ask instead
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {!finalRound && (
        <section className="tq-ask" aria-labelledby="tq-ask-heading">
          <p className="tq-last" aria-live="polite">
            {lastLine}
          </p>
          <h3 id="tq-ask-heading">{myTurn ? "Ask a question" : "Questions"}</h3>
          {!myTurn && <p className="tq-note">You can look through the list now and ask on your turn.</p>}
          <input
            type="search"
            className="tq-search"
            placeholder="Search questions…"
            aria-label="Search questions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="tq-groups" role="group" aria-label="Question categories">
            {["All", ...set.groups].map((g) => (
              <button key={g} type="button" className={`tq-chip${group === g ? " is-selected" : ""}`} aria-pressed={group === g} onClick={() => setGroup(g)}>
                {g}
              </button>
            ))}
          </div>
          <ul className="tq-question-list">
            {available.length === 0 && <li className="tq-empty">No questions match.</li>}
            {available.map((q) => (
              <li key={q.id}>
                <button type="button" className="tq-question" onClick={() => ask(q.id)} disabled={!myTurn || busy}>
                  <span className="tq-question-group">{q.group}</span>
                  <span className="tq-question-text">{q.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The end: who won (with their picture), what the secret was, its verse and article. */
function TwentyQReveal({
  room,
  players,
  userId,
  onPlayAgain,
  onOpenArticle,
  children,
}: {
  room: TwentyQRoom;
  players: TwentyQPlayer[];
  userId: string;
  onPlayAgain: () => void;
  onOpenArticle?: OpenGameArticle;
  children: ReactNode;
}) {
  const set = TQ_SETS[room.category];
  const secret = set.entries.find((e) => e.id === room.revealed_entry_id) ?? null;
  // Memoised: useFinalStandings treats a new array as a new roster.
  const standingPlayers = useMemo(() => players.map((p) => ({ ...p, score: p.user_id === room.winner_id ? 1 : 0 })), [players, room.winner_id]);
  const standings = useFinalStandings(standingPlayers, room.winner_id);
  const winner = room.winner_id ? standings.winner : undefined;
  const article = secret
    ? secret.article === undefined
      ? set.category === "things"
        ? null
        : { kind: set.category === "people" ? ("person" as const) : ("place" as const), id: secret.id, label: secret.name }
      : secret.article
    : null;
  const verse = secret ? TQ_VERSES[secret.ref] : undefined;

  return (
    <div className="game-room-play tq-room">
      <div className="tq-reveal" role="status">
        {winner && standings.multiplayer && (
          // .game-results scopes the shared winner-picture sizes (Game.css).
          <div className="game-results tq-winner">
            <ResultsWinnerPictures winners={[winner]} pictures={standings.pictures} />
          </div>
        )}
        <p className="tq-reveal-kicker">{set.label}</p>
        <h3>{winner ? (winner.user_id === userId ? "You got it!" : `${winner.display_name} got it!`) : "Out of questions."}</h3>
        {secret ? (
          <p className="tq-reveal-name">
            {winner ? "It was" : "The answer was"} <strong>{secret.name}</strong>.
          </p>
        ) : (
          <p className="tq-reveal-name">The answer couldn't be shown.</p>
        )}
        {secret && verse && (
          <figure className="tq-verse">
            <blockquote>{verse}</blockquote>
            <figcaption>{secret.ref} (WEB)</figcaption>
          </figure>
        )}
        <p className="tq-stat-line">
          {room.questions_used} of {room.question_limit} questions used.
        </p>
        <div className="tq-actions">
          {article && onOpenArticle && (
            <button type="button" className="games-primary-button" onClick={() => onOpenArticle({ kind: article.kind, id: article.id })}>
              <Icon name="articles" inline /> Read about {article.label}
            </button>
          )}
          <button type="button" className="games-secondary-button" onClick={onPlayAgain}>
            <Icon name="play" inline /> Play again
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

/** How to play, multiplayer. Shown by itself the first time someone enters a room on this device. */
export function TwentyQuestionsMultiplayerHelp() {
  return (
    <ul className="how-list">
      <li>The app picks one secret person, place or thing for the whole room. Nobody's device knows it until the end.</li>
      <li>Up to {TWENTY_Q_MAX_PLAYERS} players take turns, in the order they joined.</li>
      <li>
        On your turn, ask one question from the list, tap <strong>Make a guess</strong>, or <strong>Pass</strong>. Everyone sees
        each question, its answer and who asked.
      </li>
      <li>The room shares 20 questions. A wrong guess uses one too. Passing uses none.</li>
      <li>A turn lasts a minute. If someone is away, their turn passes when the time runs out.</li>
      <li>The first right guess wins. When all 20 are used, everyone gets one final guess, in turn.</li>
    </ul>
  );
}
