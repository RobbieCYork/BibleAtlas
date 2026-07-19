import type { VerseRef } from "../data/types";

interface VerseListProps {
  verses: VerseRef[];
  onSelectVerse?: (reference: string) => void;
}

export default function VerseList({ verses, onSelectVerse }: VerseListProps) {
  if (verses.length === 0) return null;

  return (
    <div className="verse-list">
      <h4>Bible References ({verses.length})</h4>
      <ul>
        {verses.map((v) => (
          <li key={v.reference}>
            <button
              type="button"
              className="verse-ref-button"
              onClick={() => onSelectVerse?.(v.reference)}
              disabled={!onSelectVerse}
            >
              <span className="verse-ref">{v.reference}</span>
              {v.note && <span className="verse-note"> — {v.note}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
