import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TQ_SETS, answerFor, type TQAnswer, type TQCategory, type TQEntry, type TQSet } from "../data/twentyQuestions";
import { TQ_VERSES } from "../data/twentyQuestionsVerses";
import type { OpenGameArticle } from "../lib/gameArticles";
import BackButton from "./BackButton";
import Icon, { type IconName } from "./Icon";
import HowToPlay, { HowToPlayButton } from "./HowToPlay";
import { useHowToPlay } from "../lib/howToPlay";
import "./TwentyQuestions.css";

interface TwentyQuestionsViewProps {
  onBack: () => void;
  onOpenArticle?: OpenGameArticle;
}

const TQ_LIMIT = 20;

type Choice = TQCategory | "any";
type Screen = "menu" | "playing";

interface Turn {
  kind: "question" | "guess";
  /** Question id, or the guessed entry's id. */
  id: string;
  answer: TQAnswer;
}

interface Game {
  set: TQSet;
  secret: TQEntry;
  turns: Turn[];
  status: "playing" | "won" | "lost";
}

const CHOICES: { key: Choice; label: string; description: string; icon: IconName }[] = [
  { key: "people", label: "People", description: "Someone from the Old or New Testament.", icon: "people" },
  { key: "places", label: "Places", description: "A city, region, sea, river, mountain or island on the map.", icon: "place" },
  { key: "things", label: "Things", description: "An object, animal, plant, food or structure in a Bible story.", icon: "archaeology" },
  { key: "any", label: "Surprise me", description: "Any of the three — you'll be told which.", icon: "target" },
];

const ANSWER_LABEL: Record<TQAnswer, string> = { yes: "Yes", no: "No", unknown: "Not stated" };
const ANSWER_ICON: Record<TQAnswer, string> = { yes: "✓", no: "✕", unknown: "–" };

/* ---------------------------------------------------------------- device stats */

interface CategoryStats {
  played: number;
  won: number;
  /** Fewest questions used in a win (questions asked plus wrong guesses). */
  best: number | null;
}
const STATS_KEY = "twenty-questions-v1";
const EMPTY: CategoryStats = { played: 0, won: 0, best: null };

function readStats(): Record<TQCategory, CategoryStats> {
  const out = { people: { ...EMPTY }, places: { ...EMPTY }, things: { ...EMPTY } };
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) ?? "null") as Record<string, Partial<CategoryStats>> | null;
    if (raw && typeof raw === "object") {
      for (const k of Object.keys(out) as TQCategory[]) {
        const r = raw[k];
        if (r && typeof r.played === "number" && typeof r.won === "number") out[k] = { played: r.played, won: r.won, best: typeof r.best === "number" ? r.best : null };
      }
    }
  } catch {
    /* Unreadable or blocked storage — start from zero. */
  }
  return out;
}

function writeStats(stats: Record<TQCategory, CategoryStats>) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* Storage blocked — this game still counts on screen until the page closes. */
  }
}

/** "The burning bush" reads "the burning bush" inside a sentence. */
const inSentence = (name: string) => name.replace(/^The /, "the ");

const turnsUsed = (g: Game) => g.turns.filter((t) => t.kind === "question" || t.answer !== "yes").length;

/** 20 Questions — single player. The app picks a secret person, place or thing; the player asks
 * yes/no questions from a fixed, checked list (data/twentyQuestions/) and may guess at any time. A
 * wrong guess costs a question; a right one ends the game. When all twenty are spent, one last
 * guess is still allowed. */
export default function TwentyQuestionsView({ onBack, onOpenArticle }: TwentyQuestionsViewProps) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [choice, setChoice] = useState<Choice>("people");
  const [game, setGame] = useState<Game | null>(null);
  const [stats, setStats] = useState(readStats);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>("All");
  const [guessing, setGuessing] = useState(false);
  const [guessSearch, setGuessSearch] = useState("");
  const [guessPick, setGuessPick] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const help = useHowToPlay("twenty-questions-howto-v1");

  const start = (c: Choice) => {
    const cat: TQCategory = c === "any" ? (["people", "places", "things"] as const)[Math.floor(Math.random() * 3)] : c;
    const set = TQ_SETS[cat];
    const secret = set.entries[Math.floor(Math.random() * set.entries.length)];
    setGame({ set, secret, turns: [], status: "playing" });
    setSearch("");
    setGroup("All");
    setGuessing(false);
    setGuessSearch("");
    setGuessPick(null);
    setLastAnswer(null);
    setScreen("playing");
  };

  const finish = (g: Game, status: "won" | "lost") => {
    const cat = g.set.category;
    const used = turnsUsed(g);
    const next = { ...stats, [cat]: { ...stats[cat] } };
    next[cat].played++;
    if (status === "won") {
      next[cat].won++;
      next[cat].best = next[cat].best === null ? used : Math.min(next[cat].best, used);
    }
    writeStats(next);
    setStats(next);
    return { ...g, status };
  };

  const ask = (qid: string) => {
    if (!game || game.status !== "playing") return;
    const q = game.set.questions.find((x) => x.id === qid);
    if (!q || game.turns.some((t) => t.kind === "question" && t.id === qid) || turnsUsed(game) >= TQ_LIMIT) return;
    const answer = answerFor(q, game.secret.id);
    setGame({ ...game, turns: [...game.turns, { kind: "question", id: qid, answer }] });
    setLastAnswer(`${q.text} ${ANSWER_LABEL[answer]}.`);
  };

  const guess = (entryId: string) => {
    if (!game || game.status !== "playing") return;
    const right = entryId === game.secret.id;
    const g: Game = { ...game, turns: [...game.turns, { kind: "guess", id: entryId, answer: right ? "yes" : "no" }] };
    const name = game.set.entries.find((e) => e.id === entryId)?.name ?? entryId;
    setGuessPick(null);
    setGuessSearch("");
    if (right) {
      setGame(finish(g, "won"));
      return;
    }
    // A wrong guess with no questions left — the last chance — ends the game.
    if (turnsUsed(game) >= TQ_LIMIT) {
      setGame(finish(g, "lost"));
      return;
    }
    setLastAnswer(`Is it ${inSentence(name)}? No.`);
    setGame(g);
  };

  const header = (onClick: () => void, ariaLabel: string, playing = false) => (
    <header className={`game-header${playing ? " how-header" : ""}`}>
      <BackButton onClick={onClick} ariaLabel={ariaLabel} />
      <h2 className="games-inline-icon">
        <Icon name="twentyQuestions" />
        20 Questions
      </h2>
      {playing && !help.open && <HowToPlayButton onClick={help.show} />}
    </header>
  );

  if (screen !== "playing" || !game) {
    return (
      <div className="game-root" data-page-bg="game-setup">
        {header(onBack, "Back to Game Center")}
        <div className="game-body">
          <div className="tq-setup">
            <div className="games-panel-intro">
              <p>
                The app picks a secret. Ask up to {TQ_LIMIT} yes-or-no questions from the list, then guess. Guess whenever you
                like — a wrong guess costs a question. Every answer is checked against Scripture; where the Bible doesn't
                settle it, the answer is "Not stated".
              </p>
            </div>
            <form
              className="games-panel-card game-level-setup"
              onSubmit={(e) => {
                e.preventDefault();
                start(choice);
              }}
            >
              <fieldset className="games-difficulty">
                <legend>Choose a category</legend>
                <div className="game-center-list">
                  {CHOICES.map((c) => (
                    <label key={c.key} className={`game-center-card game-level-option${choice === c.key ? " is-selected" : ""}`}>
                      <input type="radio" name="tq-category" value={c.key} checked={choice === c.key} onChange={() => setChoice(c.key)} />
                      <span className="game-center-card-icon">
                        <Icon name={c.icon} />
                      </span>
                      <span className="game-center-card-body">
                        <span className="game-center-card-title">{c.label}</span>
                        <span className="game-center-card-tagline">
                          {c.description}
                          {c.key !== "any" && ` ${TQ_SETS[c.key].entries.length} to find.`}
                        </span>
                      </span>
                      <span className="game-level-check" aria-hidden="true">
                        {choice === c.key && <Icon name="check" />}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className="games-primary-button game-start-button">
                <Icon name="play" inline /> Start game
              </button>
            </form>
            <TQStats stats={stats} />
          </div>
        </div>
      </div>
    );
  }

  const playHeader = header(() => setScreen("menu"), "Back to 20 Questions menu", true);

  if (help.open) {
    return (
      <div className="game-root">
        {playHeader}
        <HowToPlay firstTime={help.firstTime} onClose={help.close}>
          <TwentyQuestionsHelp />
        </HowToPlay>
      </div>
    );
  }

  return (
    <PlayScreen
      game={game}
      header={playHeader}
      search={search}
      setSearch={setSearch}
      group={group}
      setGroup={setGroup}
      guessing={guessing}
      setGuessing={setGuessing}
      guessSearch={guessSearch}
      setGuessSearch={setGuessSearch}
      guessPick={guessPick}
      setGuessPick={setGuessPick}
      lastAnswer={lastAnswer}
      onAsk={ask}
      onGuess={guess}
      onAgain={() => start(game.set.category)}
      onChange={() => setScreen("menu")}
      onOpenArticle={onOpenArticle}
      stats={stats}
    />
  );
}

interface PlayScreenProps {
  game: Game;
  header: ReactNode;
  search: string;
  setSearch: (s: string) => void;
  group: string;
  setGroup: (g: string) => void;
  guessing: boolean;
  setGuessing: (b: boolean) => void;
  guessSearch: string;
  setGuessSearch: (s: string) => void;
  guessPick: string | null;
  setGuessPick: (id: string | null) => void;
  lastAnswer: string | null;
  onAsk: (qid: string) => void;
  onGuess: (id: string) => void;
  onAgain: () => void;
  onChange: () => void;
  onOpenArticle?: OpenGameArticle;
  stats: Record<TQCategory, CategoryStats>;
}

function PlayScreen(p: PlayScreenProps) {
  const { game } = p;
  const { set } = game;
  const used = turnsUsed(game);
  const left = TQ_LIMIT - used;
  const asked = new Set(game.turns.filter((t) => t.kind === "question").map((t) => t.id));
  const guessed = new Set(game.turns.filter((t) => t.kind === "guess").map((t) => t.id));
  const lastChance = game.status === "playing" && left <= 0;
  // The guess card opens below the history; bring it, buttons included, into view.
  const guessRef = useRef<HTMLElement>(null);
  const guessCardOpen = game.status === "playing" && (p.guessing || lastChance);
  useEffect(() => {
    if (guessCardOpen) guessRef.current?.scrollIntoView({ block: "nearest" });
  }, [guessCardOpen]);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const available = useMemo(() => {
    const q = norm(p.search.trim());
    return set.questions.filter((x) => !asked.has(x.id) && (p.group === "All" || x.group === p.group) && (!q || norm(x.text).includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, game.turns, p.search, p.group]);

  const guessList = useMemo(() => {
    const q = norm(p.guessSearch.trim());
    return [...set.entries].sort((a, b) => a.name.localeCompare(b.name)).filter((e) => !q || norm(e.name).includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, p.guessSearch]);

  const turnText = (t: Turn) =>
    t.kind === "question" ? set.questions.find((q) => q.id === t.id)?.text ?? t.id : `Is it ${inSentence(set.entries.find((e) => e.id === t.id)?.name ?? t.id)}?`;

  const history = (
    <section className="tq-history" aria-labelledby="tq-history-heading">
      <h3 id="tq-history-heading">Asked so far</h3>
      {game.turns.length === 0 ? (
        <p className="tq-empty">Nothing yet — pick a question below.</p>
      ) : (
        <ol className="tq-history-list">
          {game.turns.map((t, i) => (
            <li key={i} className={`tq-turn${t.kind === "guess" ? " tq-turn-guess" : ""}`}>
              <span className="tq-turn-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="tq-turn-text">{turnText(t)}</span>
              <span className={`tq-answer tq-answer-${t.answer}`}>
                <span aria-hidden="true">{ANSWER_ICON[t.answer]}</span> {ANSWER_LABEL[t.answer]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  if (game.status !== "playing") {
    const won = game.status === "won";
    const article = game.secret.article === undefined
      ? set.category === "things"
        ? null
        : { kind: set.category === "people" ? ("person" as const) : ("place" as const), id: game.secret.id, label: game.secret.name }
      : game.secret.article;
    const text = TQ_VERSES[game.secret.ref];
    const s = p.stats[set.category];
    return (
      <div className="game-root">
        {p.header}
        <div className="game-body tq-body">
          <div className="tq-reveal" role="status">
            <p className="tq-reveal-kicker">{set.label}</p>
            <h3>{won ? (used === 0 ? "First try!" : `Got it, with ${used} of ${TQ_LIMIT} questions used!`) : "Out of questions."}</h3>
            <p className="tq-reveal-name">
              {won ? "It was" : "The answer was"} <strong>{game.secret.name}</strong>.
            </p>
            {text && (
              <figure className="tq-verse">
                <blockquote>{text}</blockquote>
                <figcaption>{game.secret.ref} (WEB)</figcaption>
              </figure>
            )}
            <div className="tq-actions">
              {article && p.onOpenArticle && (
                <button type="button" className="games-primary-button" onClick={() => p.onOpenArticle?.({ kind: article.kind, id: article.id })}>
                  <Icon name="articles" inline /> Read about {article.label}
                </button>
              )}
              <button type="button" className="games-secondary-button" onClick={p.onAgain}>
                <Icon name="play" inline /> Play again — {set.label}
              </button>
              <button type="button" className="games-secondary-button" onClick={p.onChange}>
                Change category
              </button>
            </div>
            <p className="tq-stat-line">
              {set.label} on this device: {s.won} won of {s.played}
              {s.best !== null && ` · best ${s.best} ${s.best === 1 ? "question" : "questions"} used`}
            </p>
          </div>
          {history}
        </div>
      </div>
    );
  }

  return (
    <div className="game-root">
      {p.header}
      <div className="game-body tq-body">
        <div className="tq-hud">
          <span className="tq-hud-cat">
            Secret {set.noun} · {set.label}
          </span>
          <span className={`tq-hud-left${left <= 3 ? " tq-hud-low" : ""}`} aria-live="polite">
            {lastChance ? "No questions left — one last guess" : `${left} of ${TQ_LIMIT} questions left`}
          </span>
        </div>
        <div className="tq-meter" aria-hidden="true">
          <span style={{ width: `${(Math.max(0, left) / TQ_LIMIT) * 100}%` }} />
        </div>

        {history}

        <section ref={guessRef} className="tq-guess" aria-labelledby="tq-guess-heading">
          {!p.guessing && !lastChance ? (
            <button type="button" className="games-primary-button tq-guess-open" onClick={() => p.setGuessing(true)}>
              <Icon name="target" inline /> Make a guess
            </button>
          ) : (
            <div className="games-panel-card tq-guess-card">
              <h3 id="tq-guess-heading">{lastChance ? "Your last guess" : `Guess the ${set.noun}`}</h3>
              {!lastChance && <p className="tq-note">A wrong guess costs one question.</p>}
              <input
                type="search"
                className="tq-search"
                placeholder={`Search ${set.entries.length} ${set.label.toLowerCase()}…`}
                aria-label={`Search ${set.label.toLowerCase()} to guess`}
                value={p.guessSearch}
                onChange={(e) => p.setGuessSearch(e.target.value)}
              />
              <ul className="tq-guess-list" role="listbox" aria-label={`${set.label} to guess from`}>
                {guessList.length === 0 && <li className="tq-empty">No match.</li>}
                {guessList.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={p.guessPick === e.id}
                      className={`tq-guess-option${p.guessPick === e.id ? " is-selected" : ""}`}
                      disabled={guessed.has(e.id)}
                      onClick={() => p.setGuessPick(e.id)}
                    >
                      {e.name}
                      {guessed.has(e.id) && <span className="tq-guessed"> — already guessed</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="tq-guess-actions">
                <button type="button" className="games-primary-button" disabled={!p.guessPick} onClick={() => p.guessPick && p.onGuess(p.guessPick)}>
                  {p.guessPick ? `Guess: ${set.entries.find((e) => e.id === p.guessPick)?.name}` : "Pick one to guess"}
                </button>
                {!lastChance && (
                  <button type="button" className="games-secondary-button" onClick={() => { p.setGuessing(false); p.setGuessPick(null); }}>
                    Keep asking
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {!lastChance && (
          <section className="tq-ask" aria-labelledby="tq-ask-heading">
            {/* The latest answer, again, right where the next question is picked — the history above
                may be scrolled out of view by then. Also the screen-reader announcement. */}
            <p className="tq-last" role="status" aria-live="polite">
              {p.lastAnswer}
            </p>
            <h3 id="tq-ask-heading">Ask a question</h3>
            <input
              type="search"
              className="tq-search"
              placeholder="Search questions…"
              aria-label="Search questions"
              value={p.search}
              onChange={(e) => p.setSearch(e.target.value)}
            />
            <div className="tq-groups" role="group" aria-label="Question categories">
              {["All", ...set.groups].map((g) => (
                <button key={g} type="button" className={`tq-chip${p.group === g ? " is-selected" : ""}`} aria-pressed={p.group === g} onClick={() => p.setGroup(g)}>
                  {g}
                </button>
              ))}
            </div>
            <ul className="tq-question-list">
              {available.length === 0 && <li className="tq-empty">No questions match.</li>}
              {available.map((q) => (
                <li key={q.id}>
                  <button type="button" className="tq-question" onClick={() => p.onAsk(q.id)}>
                    <span className="tq-question-group">{q.group}</span>
                    <span className="tq-question-text">{q.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function TwentyQuestionsHelp() {
  const samples: [TQAnswer, string][] = [
    ["yes", "It is true of the secret."],
    ["no", "It is not."],
    ["unknown", "The Bible doesn't settle it."],
  ];
  return (
    <>
      <ul className="how-list">
        <li>The app has picked a secret person, place or thing from the Bible.</li>
        <li>
          Tap a question in the list to ask it. You have {TQ_LIMIT}. Search and the category buttons narrow the list.
        </li>
        <li>
          Think you know? Tap <strong>Make a guess</strong> and pick a name. A wrong guess costs one question.
        </li>
        <li>When all {TQ_LIMIT} are used, you get one last guess.</li>
      </ul>
      <p>For example, you ask "Is this person a woman?" and the answer is one of these:</p>
      <ul className="how-marks">
        {samples.map(([a, meaning]) => (
          <li key={a}>
            <span className={`tq-answer tq-answer-${a} tq-answer-sample`}>
              <span aria-hidden="true">{ANSWER_ICON[a]}</span> {ANSWER_LABEL[a]}
            </span>
            <span>{meaning}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function TQStats({ stats }: { stats: Record<TQCategory, CategoryStats> }) {
  return (
    <section className="games-panel-card tq-stats" aria-labelledby="tq-stats-heading">
      <h3 id="tq-stats-heading" className="games-inline-icon">
        <Icon name="trophy" /> Your record <span className="tq-stats-where">(this device)</span>
      </h3>
      <table className="tq-stats-table">
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Won</th>
            <th scope="col">Played</th>
            <th scope="col">Best</th>
          </tr>
        </thead>
        <tbody>
          {(["people", "places", "things"] as const).map((c) => (
            <tr key={c}>
              <th scope="row">{TQ_SETS[c].label}</th>
              <td>{stats[c].won}</td>
              <td>{stats[c].played}</td>
              <td>{stats[c].best ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
