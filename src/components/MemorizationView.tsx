import { useEffect, useMemo, useRef, useState } from "react";
import { MEMORIZATION_VERSES, type MemorizationCategory, type MemorizationVerse } from "../data/memorizationVerses";
import BackButton from "./BackButton";
import "./Memorization.css";
import Icon from "./Icon";

interface MemorizationViewProps {
  onBack: () => void;
}

const STORAGE_KEY = "bibleAtlas.memorizationChallenge.masteredRefs.v1";

const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9']/g, "");

/** How much of the verse is hidden at each stage, as a fraction of its word count — "a couple words"
 * missing, then "a few more", building up to the whole verse. Short verses collapse stages that would
 * otherwise land on the same word count (see buildStages) so a 2-word verse doesn't get 5 identical
 * rounds. */
const STAGE_FRACTIONS = [0.2, 0.4, 0.65, 0.85, 1];

/** Fisher-Yates shuffle — used to pick which words go blank first, so hidden words spread across the
 * verse rather than clumping at the start. */
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Cumulative hidden-word counts, one per stage, strictly increasing, ending at the full word count
 * (100% hidden = type the whole verse from memory). Stages that would repeat a count (a very short
 * verse hitting the same rounded number twice) are dropped rather than shown as a no-op round. */
function buildStages(wordCount: number): number[] {
  const counts = STAGE_FRACTIONS.map((f) => Math.min(wordCount, Math.max(1, Math.round(wordCount * f))));
  counts[counts.length - 1] = wordCount;
  const stages: number[] = [];
  for (const c of counts) {
    if (stages[stages.length - 1] !== c) stages.push(c);
  }
  return stages;
}

type Mode =
  | { kind: "picker" }
  | { kind: "ready"; verse: MemorizationVerse }
  | {
      kind: "learn";
      verse: MemorizationVerse;
      stageIndex: number;
      hideOrder: number[];
      afterMastery: "picker" | "review";
      isRelearn: boolean;
      resumeQueue?: string[];
      resumeTotal?: number;
    }
  | { kind: "review"; verse: MemorizationVerse; hideOrder: number[]; queue: string[]; total: number };

function loadMastered(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => typeof r === "string") : [];
  } catch {
    return [];
  }
}

function saveMastered(refs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
  } catch {
    // localStorage unavailable (private mode, quota) — progress just won't persist across sessions
  }
}

/** "Scripture Memorization Challenge" — pick a verse, and it's blanked out a little more each round
 * (a couple words, then a few more, then a few more...) until the whole thing has to be typed from
 * memory. Once two or more verses are mastered, starting the next one is gated behind reciting every
 * verse mastered so far, fully blanked, in order — miss one and it goes back to square one (a few
 * words missing) before the new verse unlocks again. Progress (which verses are mastered) is saved
 * to localStorage; the review gate itself only fires within a play session. */
export default function MemorizationView({ onBack }: MemorizationViewProps) {
  const [mastered, setMastered] = useState<string[]>(() => loadMastered());
  const [mode, setMode] = useState<Mode>({ kind: "picker" });
  const [inputs, setInputs] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => saveMastered(mastered), [mastered]);

  const masteredSet = useMemo(() => new Set(mastered), [mastered]);

  const byCategory = useMemo(() => {
    const groups = new Map<MemorizationCategory, MemorizationVerse[]>();
    for (const v of MEMORIZATION_VERSES) {
      if (!groups.has(v.category)) groups.set(v.category, []);
      groups.get(v.category)!.push(v);
    }
    return groups;
  }, []);

  useEffect(() => {
    if ((mode.kind === "learn" || mode.kind === "review") && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [mode]);

  const startLearning = (verse: MemorizationVerse) => setMode({ kind: "ready", verse });

  const beginStages = (verse: MemorizationVerse, afterMastery: "picker" | "review", isRelearn: boolean) => {
    const words = verse.text.split(/\s+/);
    const hideOrder = shuffled(words.map((_, i) => i));
    setMode({ kind: "learn", verse, stageIndex: 0, hideOrder, afterMastery, isRelearn });
    setInputs([]);
    setChecked(false);
    setAllCorrect(false);
  };

  /** Kicks off (or resumes) a cumulative review pass. `total` is fixed for the whole pass — passed
   * down from the first call — so the "recite N of total" banner tracks position across the whole
   * queue instead of resetting to "1 of ..." every time we advance to the next verse in it. */
  const startReviewPass = (queue: string[], total: number = queue.length) => {
    if (queue.length === 0) {
      setMode({ kind: "picker" });
      return;
    }
    const ref = queue[0];
    const verse = MEMORIZATION_VERSES.find((v) => v.reference === ref)!;
    const words = verse.text.split(/\s+/);
    const hideOrder = shuffled(words.map((_, i) => i));
    setMode({ kind: "review", verse, hideOrder, queue, total });
    setInputs([]);
    setChecked(false);
    setAllCorrect(false);
  };

  const submitLearnStage = () => {
    if (mode.kind !== "learn") return;
    const words = mode.verse.text.split(/\s+/);
    const stages = buildStages(words.length);
    const hiddenCount = stages[mode.stageIndex];
    const hiddenIdx = new Set(mode.hideOrder.slice(0, hiddenCount));
    const hiddenIndices = words.map((_, i) => i).filter((i) => hiddenIdx.has(i));
    const correct = hiddenIndices.every((wi, k) => normalize(inputs[k] ?? "") === normalize(words[wi]));
    setChecked(true);
    setAllCorrect(correct);
    if (!correct) return;

    const isFinal = mode.stageIndex === stages.length - 1;
    if (isFinal) {
      const justMastered = mode.verse.reference;
      const newMastered = mastered.includes(justMastered) ? mastered : [...mastered, justMastered];
      window.setTimeout(() => {
        setMastered(newMastered);
        if (mode.afterMastery === "review" && newMastered.length >= 2) {
          startReviewPass(newMastered);
        } else if (mode.isRelearn && mode.resumeQueue) {
          // Relearned after a failed review — resume the review queue right after this verse, keeping
          // the original pass's total so the "recite N of total" banner doesn't reset partway through.
          startReviewPass(mode.resumeQueue, mode.resumeTotal);
        } else {
          setMode({ kind: "picker" });
        }
      }, 1400);
    } else {
      window.setTimeout(() => {
        setMode({ ...mode, stageIndex: mode.stageIndex + 1 });
        setInputs([]);
        setChecked(false);
        setAllCorrect(false);
      }, 1000);
    }
  };

  const submitReview = () => {
    if (mode.kind !== "review") return;
    const words = mode.verse.text.split(/\s+/);
    const correct = words.every((w, i) => normalize(inputs[i] ?? "") === normalize(w));
    setChecked(true);
    setAllCorrect(correct);

    window.setTimeout(() => {
      const remaining = mode.queue.slice(1);
      if (correct) {
        startReviewPass(remaining, mode.total);
      } else {
        // Failed — send this verse back to relearn from stage 0, then resume review with what's left.
        const words2 = mode.verse.text.split(/\s+/);
        const hideOrder = shuffled(words2.map((_, i) => i));
        setMode({
          kind: "learn",
          verse: mode.verse,
          stageIndex: 0,
          hideOrder,
          afterMastery: "picker",
          isRelearn: true,
          resumeQueue: remaining,
          resumeTotal: mode.total,
        });
        setInputs([]);
        setChecked(false);
        setAllCorrect(false);
      }
    }, correct ? 900 : 2200);
  };

  const changeInput = (i: number, v: string) => setInputs((prev) => { const next = [...prev]; next[i] = v; return next; });

  const backToPicker = () => {
    setMode({ kind: "picker" });
    setInputs([]);
    setChecked(false);
    setAllCorrect(false);
  };

  const resetProgress = () => {
    if (!window.confirm("Reset all memorization progress? This clears every verse you've mastered.")) return;
    setMastered([]);
    backToPicker();
  };

  // ---------- Picker ----------
  if (mode.kind === "picker") {
    const remaining = MEMORIZATION_VERSES.length - mastered.length;
    const filtered = searchQuery.trim()
      ? MEMORIZATION_VERSES.filter(
          (v) => v.reference.toLowerCase().includes(searchQuery.toLowerCase()) || v.text.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : null;

    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2 className="games-inline-icon">
          <Icon name="memorization" />
          Scripture Memorization Challenge
        </h2>
        </header>
        <div className="game-body">
          <div className="memchallenge-picker">
            <div className="games-panel-intro">
              <h2>Choose a verse</h2>
              <p>
                {mastered.length} of {MEMORIZATION_VERSES.length} mastered
                {remaining > 0 ? ` — ${remaining} to go` : " — you've learned them all! 🎉"}
              </p>
            </div>

            {mastered.length > 0 && (
              <button type="button" className="memchallenge-reset-link" onClick={resetProgress}>
                Reset progress
              </button>
            )}

            <input
              type="text"
              className="memchallenge-search"
              placeholder="Search by reference or words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {filtered ? (
              <div className="game-center-list memchallenge-verse-list">
                {filtered.map((v) => (
                  <VersePickerRow key={v.reference} verse={v} mastered={masteredSet.has(v.reference)} onPick={() => startLearning(v)} />
                ))}
                {filtered.length === 0 && <p className="memchallenge-empty">No verses match "{searchQuery}".</p>}
              </div>
            ) : (
              Array.from(byCategory.entries()).map(([cat, verses]) => (
                <div key={cat} className="memchallenge-category">
                  <h3 className="memchallenge-category-title">{cat}</h3>
                  <div className="game-center-list memchallenge-verse-list">
                    {verses.map((v) => (
                      <VersePickerRow key={v.reference} verse={v} mastered={masteredSet.has(v.reference)} onPick={() => startLearning(v)} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Ready screen ----------
  if (mode.kind === "ready") {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={backToPicker} ariaLabel="Back to verse list" />
          <h2 className="games-inline-icon">
          <Icon name="memorization" />
          Scripture Memorization Challenge
        </h2>
        </header>
        <div className="game-body">
          <div className="memchallenge-ready">
            <p className="memchallenge-reference">{mode.verse.reference}</p>
            <p className="memchallenge-fulltext">{mode.verse.text}</p>
            <p className="memchallenge-ready-hint">Read it a few times. When you're ready, a couple of words will disappear — fill them back in from memory.</p>
            <button type="button" className="memchallenge-btn-primary" onClick={() => beginStages(mode.verse, "review", false)}>
              I'm Ready →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Learning a verse (progressive blanks) ----------
  if (mode.kind === "learn") {
    const words = mode.verse.text.split(/\s+/);
    const stages = buildStages(words.length);
    const hiddenCount = stages[mode.stageIndex];
    const hiddenSet = new Set(mode.hideOrder.slice(0, hiddenCount));
    const isFinal = mode.stageIndex === stages.length - 1;
    let blankCursor = 0;

    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={backToPicker} ariaLabel="Back to verse list" />
          <h2 className="games-inline-icon">
          <Icon name="memorization" />
          Scripture Memorization Challenge
        </h2>
        </header>
        <div className="game-body">
          <div className="memchallenge-play">
            {mode.isRelearn && <p className="memchallenge-relearn-banner">↻ Missed this one in review — relearning it from the start.</p>}
            <p className="memchallenge-reference">{mode.verse.reference}</p>
            <p className="memchallenge-stage-label">
              {isFinal ? "Final round — the whole verse" : `Round ${mode.stageIndex + 1} of ${stages.length}`}
            </p>
            <div className="memchallenge-stage-dots">
              {stages.map((_, i) => (
                <span key={i} className={`memchallenge-dot ${i < mode.stageIndex ? "memchallenge-dot-done" : i === mode.stageIndex ? "memchallenge-dot-active" : ""}`} />
              ))}
            </div>

            <p className="memchallenge-verse-text">
              {words.map((word, wi) => {
                if (hiddenSet.has(wi)) {
                  const thisIdx = blankCursor;
                  blankCursor++;
                  const wrong = checked && !allCorrect && normalize(inputs[thisIdx] ?? "") !== normalize(word);
                  const right = checked && normalize(inputs[thisIdx] ?? "") === normalize(word);
                  return (
                    <span key={`b-${wi}`} className="memchallenge-blank-wrap">
                      <input
                        ref={thisIdx === 0 ? firstInputRef : undefined}
                        type="text"
                        className={`memchallenge-input ${right ? "memchallenge-input-correct" : ""} ${wrong ? "memchallenge-input-wrong" : ""}`}
                        value={inputs[thisIdx] ?? ""}
                        onChange={(e) => changeInput(thisIdx, e.target.value)}
                        disabled={checked && allCorrect}
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        style={{ width: `${Math.max(3, word.length) + 1.5}ch` }}
                      />
                      {wrong && <span className="memchallenge-answer-reveal">{word}</span>}
                    </span>
                  );
                }
                return <span key={`w-${wi}`}> {word} </span>;
              })}
            </p>

            {checked ? (
              <p className={allCorrect ? "memchallenge-result-correct" : "memchallenge-result-wrong"}>
                {allCorrect ? (isFinal ? <><Icon name="check" inline /> Verse mastered!</> : <><Icon name="check" inline /> Nice — a few more words next round.</>) : <><Icon name="close" inline /> Not quite — try again.</>}
              </p>
            ) : (
              <button type="button" className="memchallenge-btn-primary" onClick={submitLearnStage}>
                Check
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Cumulative review before the next new verse ----------
  if (mode.kind === "review") {
    const words = mode.verse.text.split(/\s+/);
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={backToPicker} ariaLabel="Back to verse list" />
          <h2 className="games-inline-icon">
          <Icon name="memorization" />
          Scripture Memorization Challenge
        </h2>
        </header>
        <div className="game-body">
          <div className="memchallenge-play">
            <p className="memchallenge-review-banner">
              <Icon name="restart" inline /> Cumulative review — recite {mode.total - mode.queue.length + 1} of {mode.total} before your next new verse.
            </p>
            <p className="memchallenge-reference">{mode.verse.reference}</p>
            <p className="memchallenge-verse-text">
              {words.map((word, wi) => {
                const wrong = checked && !allCorrect && normalize(inputs[wi] ?? "") !== normalize(word);
                const right = checked && normalize(inputs[wi] ?? "") === normalize(word);
                return (
                  <span key={`rb-${wi}`} className="memchallenge-blank-wrap">
                    <input
                      ref={wi === 0 ? firstInputRef : undefined}
                      type="text"
                      className={`memchallenge-input ${right ? "memchallenge-input-correct" : ""} ${wrong ? "memchallenge-input-wrong" : ""}`}
                      value={inputs[wi] ?? ""}
                      onChange={(e) => changeInput(wi, e.target.value)}
                      disabled={checked}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      style={{ width: `${Math.max(3, word.length) + 1.5}ch` }}
                    />
                    {wrong && <span className="memchallenge-answer-reveal">{word}</span>}
                  </span>
                );
              })}
            </p>

            {checked ? (
              <p className={allCorrect ? "memchallenge-result-correct" : "memchallenge-result-wrong"}>
                {allCorrect ? <><Icon name="check" inline /> Correct!</> : <><Icon name="close" inline /> Not quite — back to a few words missing for this one.</>}
              </p>
            ) : (
              <button type="button" className="memchallenge-btn-primary" onClick={submitReview}>
                Check
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function VersePickerRow({ verse, mastered, onPick }: { verse: MemorizationVerse; mastered: boolean; onPick: () => void }) {
  return (
    <button type="button" className="game-center-card memchallenge-verse-row" onClick={onPick}>
      <span className="game-center-card-icon" aria-hidden="true">
        <Icon name={mastered ? "check" : "bible"} />
      </span>
      <span className="game-center-card-body">
        <span className="game-center-card-title">{verse.reference}</span>
        <span className="game-center-card-tagline">{verse.text}</span>
      </span>
      <span className="game-center-card-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}
