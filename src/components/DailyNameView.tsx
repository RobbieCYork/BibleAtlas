import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MAX_GUESSES,
  answerForPuzzle,
  computeStats,
  isAcceptedGuess,
  isFinished,
  isWon,
  localDateKey,
  markGuess,
  practiceAnswer,
  puzzleNumber,
  readDays,
  shareText,
  writeDay,
  type DailyRecord,
  type LetterMark,
} from "../lib/dailyName";
import { DAILY_NAME_ANSWERS, type DailyNameAnswer } from "../data/dailyName";
import type { OpenGameArticle } from "../lib/gameArticles";
import BackButton from "./BackButton";
import Icon from "./Icon";
import { GameEntryChoices } from "./GameEntry";
import HowToPlay, { HowToPlayButton } from "./HowToPlay";
import { useHowToPlay } from "../lib/howToPlay";
import "./DailyName.css";

interface DailyNameViewProps {
  onBack: () => void;
  onOpenArticle?: OpenGameArticle;
}

type Screen = "home" | "menu" | "playing";
type Mode = "daily" | "practice";

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
/** One shared empty list, so "no guesses yet" is the same array on every render. */
const NO_GUESSES: string[] = [];

const MARK_WORDS: Record<LetterMark, string> = { right: "right spot", elsewhere: "in the name, wrong spot", absent: "not in the name" };
const MARK_RANK: Record<LetterMark, number> = { absent: 0, elsewhere: 1, right: 2 };
const ALL_MARKS: LetterMark[] = ["right", "elsewhere", "absent"];

/** The shape of each mark in words, so the How to play panel never rests on colour. */
const MARK_LOOK: Record<LetterMark, string> = {
  right: "Solid tile, filled dot.",
  elsewhere: "Dashed edge, half dot.",
  absent: "Faded tile, empty ring.",
};
const MARK_MEANING: Record<LetterMark, [one: string, many: string]> = {
  right: ["is in the right spot", "are in the right spots"],
  elsewhere: ["is in the name, but in a different spot", "are in the name, but in different spots"],
  absent: ["is not in the name", "are not in the name"],
};

/** Worked examples for How to play. Each shows all three marks, and the marks are worked out by the
 * real rules. There are two so the example can never name the answer being played. */
const EXAMPLES = [
  { hidden: "ADAM", guess: "AMOS" },
  { hidden: "SETH", guess: "SHEM" },
];
const titleCase = (w: string) => `${w[0]}${w.slice(1).toLowerCase()}`;

/** A stored day keeps the word it was played against; its reveal details are looked up again here. */
const ANSWER_BY_WORD = new Map(DAILY_NAME_ANSWERS.map((a) => [a.word, a]));

/** Daily Name — guess the day's hidden Bible name in six tries. See lib/dailyName.ts for the rules
 * and data/dailyName.ts (generated) for where the names come from. */
export default function DailyNameView({ onBack, onOpenArticle }: DailyNameViewProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("daily");
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const [days, setDays] = useState<Record<string, DailyRecord>>(() => readDays());
  const [practice, setPractice] = useState<{ answer: DailyNameAnswer; guesses: string[] } | null>(null);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const help = useHowToPlay("daily-name-howto-v1");

  // A tab left open past midnight moves on to the new day's name the next time the screen is used.
  useEffect(() => {
    const tick = () => setTodayKey(localDateKey());
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const number = puzzleNumber(todayKey);
  const todayAnswer = answerForPuzzle(number);
  const todayRecord: DailyRecord = days[todayKey] ?? { guesses: NO_GUESSES, word: todayAnswer.word };
  const stats = useMemo(() => computeStats(days, todayKey), [days, todayKey]);

  const answer = mode === "daily" ? (ANSWER_BY_WORD.get(todayRecord.word) ?? todayAnswer) : practice?.answer ?? todayAnswer;
  const guesses = mode === "daily" ? todayRecord.guesses : practice?.guesses ?? NO_GUESSES;
  const record: DailyRecord = { guesses, word: answer.word };
  const finished = isFinished(record);
  const won = isWon(record);
  const length = answer.word.length;

  const keyMarks = useMemo(() => {
    const best: Record<string, LetterMark> = {};
    for (const g of guesses) {
      markGuess(g, answer.word).forEach((m, i) => {
        const letter = g[i];
        if (!best[letter] || MARK_RANK[m] > MARK_RANK[best[letter]]) best[letter] = m;
      });
    }
    return best;
  }, [guesses, answer.word]);

  const saveGuesses = useCallback(
    (next: string[]) => {
      if (mode === "daily") {
        const rec = { guesses: next, word: answer.word };
        writeDay(todayKey, rec);
        setDays((d) => ({ ...d, [todayKey]: rec }));
      } else {
        setPractice((p) => (p ? { ...p, guesses: next } : p));
      }
    },
    [mode, answer.word, todayKey]
  );

  const submit = useCallback(() => {
    if (finished) return;
    if (typed.length < length) {
      setMessage(`Not enough letters: this name has ${length}.`);
      return;
    }
    if (!isAcceptedGuess(typed)) {
      setMessage(`${titleCase(typed)} isn't in the list of Bible names.`);
      return;
    }
    if (guesses.includes(typed)) {
      setMessage("You've already tried that name.");
      return;
    }
    const next = [...guesses, typed];
    saveGuesses(next);
    setTyped("");
    setMessage(null);
  }, [finished, typed, length, guesses, saveGuesses]);

  const press = useCallback(
    (key: string) => {
      if (finished) return;
      setShareNote(null);
      if (key === "ENTER") return submit();
      setMessage(null);
      if (key === "BACK") return setTyped((t) => t.slice(0, -1));
      if (/^[A-Z]$/.test(key)) setTyped((t) => (t.length < length ? t + key : t));
    },
    [finished, submit, length]
  );

  // The physical keyboard, while the board is on screen.
  useEffect(() => {
    if (screen !== "playing" || help.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      // Enter on a focused on-screen button (Share, Practice…) should press that button, not submit.
      if (e.key === "Enter" && target?.tagName === "BUTTON" && !target.classList.contains("dn-key")) return;
      if (e.key === "Enter") press("ENTER");
      else if (e.key === "Backspace") press("BACK");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, help.open, press]);

  const startDaily = () => {
    setMode("daily");
    setTyped("");
    setMessage(null);
    setShareNote(null);
    setShareFallback(null);
    setScreen("playing");
  };
  const startPractice = () => {
    setMode("practice");
    setPractice({ answer: practiceAnswer(todayAnswer.word), guesses: [] });
    setTyped("");
    setMessage(null);
    setShareNote(null);
    setShareFallback(null);
    setScreen("playing");
  };

  const share = async () => {
    const text = shareText(number, todayRecord);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote("Result copied — no letters, so it won't give the name away.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShareNote("Couldn't share from this browser. Your result is shown below to copy.");
      setShareFallback(text);
    }
  };

  const header = (onClick: () => void, ariaLabel: string, playing = false) => (
    <header className={`game-header${playing ? " how-header" : ""}`}>
      <BackButton onClick={onClick} ariaLabel={ariaLabel} />
      <h2 className="games-inline-icon">
        <Icon name="dailyName" />
        Daily Name
      </h2>
      {playing && !help.open && <HowToPlayButton onClick={help.show} />}
    </header>
  );

  if (screen === "home" || screen === "menu") {
    const todayDone = isFinished(todayRecord);
    return (
      <div className="game-root" data-page-bg="game-setup">
        {header(screen === "home" ? onBack : () => setScreen("home"), screen === "home" ? "Back to Game Center" : "Back")}
        <div className="game-body">
          {screen === "home" ? (
            <GameEntryChoices onSolo={() => setScreen("menu")} />
          ) : (
            <div className="dn-setup">
              <div className="games-panel-intro">
                <h2>Play solo</h2>
                <p>
                  Guess the hidden Bible name — a person or a place — in {MAX_GUESSES} tries. Each guess must be a real name
                  from the Bible. Everyone gets the same name on the same day.
                </p>
              </div>
              <div className="game-center-list">
                <button type="button" className="game-center-card game-entry-card" onClick={startDaily}>
                  <span className="game-center-card-icon">
                    <Icon name="calendar" />
                  </span>
                  <span className="game-center-card-body">
                    <span className="game-center-card-title">Today's name · #{number}</span>
                    <span className="game-center-card-tagline">
                      {todayDone ? (isWon(todayRecord) ? "Solved — see your result" : "Finished — see who it was") : todayRecord.guesses.length ? "Carry on where you left off" : `${todayAnswer.word.length} letters`}
                    </span>
                  </span>
                  <span className="game-center-card-chevron" aria-hidden="true">›</span>
                </button>
                <button type="button" className="game-center-card game-entry-card" onClick={startPractice}>
                  <span className="game-center-card-icon">
                    <Icon name="target" />
                  </span>
                  <span className="game-center-card-body">
                    <span className="game-center-card-title">Practice</span>
                    <span className="game-center-card-tagline">As many random names as you like. Doesn't count toward your streak.</span>
                  </span>
                  <span className="game-center-card-chevron" aria-hidden="true">›</span>
                </button>
              </div>
              <StatsPanel stats={stats} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i < guesses.length) return { letters: guesses[i].split(""), marks: markGuess(guesses[i], answer.word) as (LetterMark | null)[] };
    if (i === guesses.length && !finished) return { letters: typed.padEnd(length).split(""), marks: Array(length).fill(null) as (LetterMark | null)[] };
    return { letters: Array(length).fill(" ") as string[], marks: Array(length).fill(null) as (LetterMark | null)[] };
  });

  const playHeader = header(() => setScreen("menu"), "Back to Daily Name menu", true);

  if (help.open) {
    return (
      <div className="game-root">
        {playHeader}
        <HowToPlay firstTime={help.firstTime} onClose={help.close}>
          <DailyNameHelp length={length} answer={answer.word} />
        </HowToPlay>
      </div>
    );
  }

  // Under the board while the first guess is being typed: what to do next.
  const toGo = length - typed.length;
  const hint =
    finished || guesses.length > 0
      ? null
      : typed.length === 0
        ? `Type a ${length}-letter Bible name, then tap Enter.`
        : toGo > 0
          ? `${toGo} more ${toGo === 1 ? "letter" : "letters"}, then tap Enter.`
          : "Now tap Enter to check it.";

  return (
    <div className="game-root">
      {playHeader}
      {/* While a guess is still to be made the screen is sized to fit: the board gives up height so
          the whole keyboard stays above the tab bar. The result scrolls as usual. */}
      <div className={`game-body dn-body${finished ? "" : " dn-fit"}`}>
        <p className="dn-status">
          {mode === "daily" ? `Daily Name #${number}` : "Practice"} · {length} letters · guess {Math.min(guesses.length + (finished ? 0 : 1), MAX_GUESSES)} of {MAX_GUESSES}
        </p>

        <div className="dn-board-fit">
          <div className="dn-board" role="grid" aria-label={`Guesses, ${length} letters each`} style={{ ["--dn-len" as string]: length }}>
            {rows.map((row, r) => (
              <div key={r} role="row" className="dn-row" aria-label={r < guesses.length ? `Guess ${r + 1}: ${guesses[r]}` : r === guesses.length && !finished ? "Current guess" : undefined}>
                {row.letters.map((ch, c) => {
                  const mark = row.marks[c];
                  return (
                    <span
                      key={c}
                      role="gridcell"
                      className={`dn-tile${mark ? ` dn-${mark}` : ""}${ch.trim() && !mark ? " dn-typed" : ""}`}
                      aria-label={ch.trim() ? `${ch}${mark ? `, ${MARK_WORDS[mark]}` : ""}` : "empty"}
                    >
                      <span className="dn-letter" aria-hidden="true">{ch.trim()}</span>
                      {mark && <span className="dn-mark" aria-hidden="true" />}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="dn-under">
          <p className="dn-message" role="status" aria-live="polite">
            {message}
          </p>
          {!message && hint && <p className="dn-hint">{hint}</p>}
        </div>

        {finished ? (
          <div className="dn-result">
            <h3>{won ? `Solved in ${guesses.indexOf(answer.word) + 1}!` : "Not this time."}</h3>
            <p className="dn-answer">
              It was <strong>{answer.label}</strong>
              <span className="dn-answer-kind"> · {answer.kind === "person" ? "person" : "place"}</span>
            </p>
            <figure className="dn-verse">
              <blockquote>{answer.text}</blockquote>
              <figcaption>{answer.ref} (WEB)</figcaption>
            </figure>
            <div className="dn-actions">
              {onOpenArticle && (
                <button type="button" className="games-primary-button" onClick={() => onOpenArticle({ kind: answer.kind, id: answer.id })}>
                  <Icon name={answer.kind === "person" ? "people" : "place"} inline /> Read about {answer.label}
                </button>
              )}
              {mode === "daily" && (
                <button type="button" className="games-secondary-button" onClick={() => void share()}>
                  <Icon name="share" inline /> Share result
                </button>
              )}
              <button type="button" className="games-secondary-button" onClick={startPractice}>
                {mode === "practice" ? "Another practice name" : "Practice with another name"}
              </button>
            </div>
            {shareNote && <p className="dn-share-note" role="status">{shareNote}</p>}
            {shareFallback && <pre className="dn-share-fallback">{shareFallback}</pre>}
            {mode === "daily" && <StatsPanel stats={stats} />}
            {mode === "daily" && <p className="dn-next">A new name tomorrow.</p>}
          </div>
        ) : (
          <div className="dn-keyboard" role="group" aria-label="Keyboard">
            {KEY_ROWS.map((row, i) => (
              <div key={row} className="dn-key-row">
                {i === 2 && (
                  <button type="button" className="dn-key dn-key-wide" onClick={() => press("ENTER")}>
                    Enter
                  </button>
                )}
                {row.split("").map((k) => {
                  const m = keyMarks[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`dn-key${m ? ` dn-${m}` : ""}`}
                      onClick={() => press(k)}
                      aria-label={m ? `${k}, ${MARK_WORDS[m]}` : k}
                    >
                      <span className="dn-letter">{k}</span>
                      {m && <span className="dn-mark" aria-hidden="true" />}
                    </button>
                  );
                })}
                {i === 2 && (
                  <button type="button" className="dn-key dn-key-wide" onClick={() => press("BACK")} aria-label="Delete letter">
                    ⌫
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <Legend />
      </div>
    </div>
  );
}

function DailyNameHelp({ length, answer }: { length: number; answer: string }) {
  const example = EXAMPLES.find((e) => e.hidden !== answer) ?? EXAMPLES[0];
  const marks = markGuess(example.guess, example.hidden);
  const letters = example.guess.split("");
  return (
    <>
      <ul className="how-list">
        <li>Guess the hidden Bible name, a person or a place, in {MAX_GUESSES} tries.</li>
        <li>
          Every guess must be a real Bible name with <strong>{length} letters</strong>.
        </li>
        <li>
          Type it, then tap <strong>Enter</strong>.
        </li>
      </ul>
      <p>
        Say the hidden name is <strong>{titleCase(example.hidden)}</strong> and you guess{" "}
        <strong>{titleCase(example.guess)}</strong>:
      </p>
      <div className="dn-row dn-example" role="img" aria-label={letters.map((l, i) => `${l}, ${MARK_WORDS[marks[i]]}`).join("; ")}>
        {letters.map((l, i) => (
          <span key={i} className={`dn-tile dn-${marks[i]}`} aria-hidden="true">
            <span className="dn-letter">{l}</span>
            <span className="dn-mark" />
          </span>
        ))}
      </div>
      <ul className="how-marks">
        {ALL_MARKS.map((m) => {
          const these = letters.filter((_, i) => marks[i] === m);
          return (
            <li key={m}>
              <span className={`dn-tile dn-tile-sample dn-${m}`} aria-hidden="true">
                <span className="dn-letter">{these[0]}</span>
                <span className="dn-mark" />
              </span>
              <span>
                <strong>{these.join(" and ")}</strong> {MARK_MEANING[m][these.length > 1 ? 1 : 0]}. <span className="dn-look">{MARK_LOOK[m]}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Legend() {
  return (
    <ul className="dn-legend" aria-label="What the marks mean">
      {ALL_MARKS.map((m) => (
        <li key={m}>
          <span className={`dn-tile dn-tile-sample dn-${m}`} aria-hidden="true">
            <span className="dn-letter">A</span>
            <span className="dn-mark" />
          </span>
          <span>{MARK_WORDS[m][0].toUpperCase() + MARK_WORDS[m].slice(1)}</span>
        </li>
      ))}
    </ul>
  );
}

function StatsPanel({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const max = Math.max(1, ...stats.distribution);
  return (
    <section className="games-panel-card dn-stats" aria-labelledby="dn-stats-heading">
      <h3 id="dn-stats-heading" className="games-inline-icon">
        <Icon name="trophy" /> Your stats <span className="dn-stats-where">(this device)</span>
      </h3>
      <dl className="dn-stats-row">
        <div>
          <dt>Played</dt>
          <dd>{stats.played}</dd>
        </div>
        <div>
          <dt>Won</dt>
          <dd>{stats.played ? Math.round((stats.won / stats.played) * 100) : 0}%</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{stats.currentStreak}</dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd>{stats.maxStreak}</dd>
        </div>
      </dl>
      <ol className="dn-dist" aria-label="Wins by number of guesses">
        {stats.distribution.map((n, i) => (
          <li key={i}>
            <span className="dn-dist-n">{i + 1}</span>
            <span className="dn-dist-bar" style={{ width: `${Math.max(8, (n / max) * 100)}%` }}>
              {n}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
