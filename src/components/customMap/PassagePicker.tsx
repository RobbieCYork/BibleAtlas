import { useEffect, useRef, useState } from "react";
import { findPassagePlaces, parsePassage, type PassagePlaces } from "../../lib/customMap/passage";
import { CERTAINTY_LABEL, PLACES, type PlaceKey } from "../../lib/customMap/places";
import Sheet from "./Sheet";

function Row({ placeId, checked, note, onToggle }: { placeId: PlaceKey; checked: boolean; note: string; onToggle: () => void }) {
  const place = PLACES.get(placeId)!;
  return (
    <label className="cm-check cm-passage-row">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span>
        <span className="cm-result-name">
          {place.name}
          {place.certainty && <span className={`cm-chip cm-chip-${place.certainty.level}`}>{CERTAINTY_LABEL[place.certainty.level]}</span>}
        </span>
        <span className="cm-result-detail">{place.detail}</span>
        <span className="cm-result-detail">{note}</span>
      </span>
    </label>
  );
}

const versesText = (verses: string[]) =>
  `${verses.length === 1 ? "Verse" : "Verses"} ${verses.slice(0, 8).join(", ")}${verses.length > 8 ? ` and ${verses.length - 8} more` : ""}`;

/** "14:19" as a number that sorts. */
const versePosition = (at: string) => {
  const [chapter, verse] = at.split(":").map(Number);
  return chapter * 1000 + verse;
};

/** Type a passage, see the places the app links to it, tick the ones to add. */
export default function PassagePicker({
  added,
  room,
  onAdd,
}: {
  added: PlaceKey[];
  /** How many more places the slide will take. */
  room: number;
  onAdd: (keys: PlaceKey[]) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PassagePlaces | null>(null);
  const [picked, setPicked] = useState<Set<PlaceKey>>(new Set());
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const find = async () => {
    const range = parsePassage(input);
    if ("error" in range) return setError(range.error);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setBusy(true);
    try {
      const found = await findPassagePlaces(range, controller.signal);
      if (controller.signal.aborted) return;
      setPicked(new Set(found.named.map((p) => p.key).filter((k) => !added.includes(k))));
      setResult(found);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Couldn't read that passage.");
    } finally {
      if (request.current === controller) setBusy(false);
    }
  };

  const toggle = (key: PlaceKey) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const rows = (key: PlaceKey, note: string) => (
    <Row
      key={key}
      placeId={key}
      checked={picked.has(key)}
      note={added.includes(key) ? `${note} · already on this slide` : note}
      onToggle={() => toggle(key)}
    />
  );

  // Added in order of first mention, which is what a journey wants.
  const chosen = result
    ? [
        ...new Set([
          ...[
            ...result.named.map((p) => ({ key: p.key, verse: p.verses[0] })),
            ...result.choices.flatMap((c) => c.options.map((key) => ({ key, verse: c.verses[0] }))),
          ]
            .sort((a, b) => versePosition(a.verse) - versePosition(b.verse))
            .map((p) => p.key),
          ...result.listedOnly.map((p) => p.key),
        ]),
      ].filter((k) => picked.has(k) && !added.includes(k))
    : [];
  const empty = result && !result.named.length && !result.choices.length && !result.listedOnly.length;

  return (
    <div className="cm-search">
      <form
        className="cm-passage-form"
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <input
          type="text"
          value={input}
          placeholder="Passage, e.g. Luke 2 or Acts 13-14"
          aria-label="Bible passage"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="cm-button cm-button-primary" disabled={busy || !input.trim()}>
          {busy ? "Reading…" : "Find places"}
        </button>
      </form>
      {error && <p className="cm-error" role="alert">{error}</p>}
      {result && (
        <Sheet
          title={`Places in ${result.label}`}
          onClose={() => setResult(null)}
          footer={
            <>
              {chosen.length > room && <span className="cm-error">This slide has room for {room} more.</span>}
              <button
                type="button"
                className="cm-button cm-button-primary"
                disabled={chosen.length === 0 || room === 0}
                onClick={() => {
                  onAdd(chosen.slice(0, room));
                  setResult(null);
                  setInput("");
                }}
              >
                Add {Math.min(chosen.length, room)} place{Math.min(chosen.length, room) === 1 ? "" : "s"}
              </button>
            </>
          }
        >
          {!result.textLoaded && (
            <p className="cm-notice">
              The verse text couldn't be loaded, so this shows only places whose own page lists these verses. Try again when
              you're connected.
            </p>
          )}
          {empty && <p className="cm-notice">The app links no places to {result.label}.</p>}
          {result.named.length > 0 && (
            <fieldset className="cm-group">
              <legend>Named in the passage</legend>
              {result.named.map((p) => rows(p.key, versesText(p.verses)))}
            </fieldset>
          )}
          {result.choices.map((c) => (
            <fieldset className="cm-group cm-choice" key={c.name}>
              <legend>Which {c.name}? ({versesText(c.verses).toLowerCase()})</legend>
              <p className="cm-hint">
                More than one place goes by this name. Read the verses, then tick the ones you mean; different verses can mean
                different places.
              </p>
              {c.options.map((key) => rows(key, c.linked.includes(key) ? "The Bible reader links this name here" : "Same name"))}
            </fieldset>
          ))}
          {result.listedOnly.length > 0 && (
            <fieldset className="cm-group">
              <legend>Also listed on a place's page for these verses</legend>
              {result.listedOnly.map((p) => rows(p.key, `Its page cites ${p.listed}`))}
            </fieldset>
          )}
        </Sheet>
      )}
    </div>
  );
}
