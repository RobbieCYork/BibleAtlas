import { bookIntros } from "../data/bookIntros";
import LinkedVerseText from "./LinkedVerseText";

interface BookIntroViewProps {
  book: string;
  onJumpToChapter: (chapter: number, verse?: number) => void;
  /** Set only when this book's Introduction was opened from the Timeline's Books-of-the-Bible band
   * (its only entry point today) — renders a "Back to Timeline" affordance that restores the
   * Timeline view the reader left, via App's detailsHistory back-trail (see goBackInDetails). */
  onBack?: () => void;
  /** Same auto-linking callbacks PersonPanel/TopicPanel/TimelineEventPanel already use — book intro
   * prose (e.g. Genesis's mentions Abraham, Moses, Egypt) links the same way theirs does. */
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectTopic: (id: string) => void;
}

export default function BookIntroView({ book, onJumpToChapter, onBack, onSelectLocation, onSelectPoi, onSelectPerson, onSelectTopic }: BookIntroViewProps) {
  const linkHandlers = { onSelectLocation, onSelectPoi, onSelectPerson, onSelectTopic };
  const intro = bookIntros.find((b) => b.book === book);

  if (!intro) {
    return (
      <div className="book-intro">
        {onBack && (
          <button type="button" className="panel-back" onClick={onBack} aria-label="Back to Timeline">
            ← Back to Timeline
          </button>
        )}
        <h4>{book} — Introduction</h4>
        <p className="bible-status">No introduction available for this book yet.</p>
      </div>
    );
  }

  return (
    <div className="book-intro">
      {onBack && (
        <button type="button" className="panel-back" onClick={onBack} aria-label="Back to Timeline">
          ← Back to Timeline
        </button>
      )}
      <h4>{intro.book} — Introduction</h4>

      <div className="book-intro-facts">
        <div className="book-intro-fact">
          <span className="book-intro-fact-label">Written</span>
          <span>{intro.writtenWhen}</span>
        </div>
        <div className="book-intro-fact">
          <span className="book-intro-fact-label">Author</span>
          <span>{intro.author}</span>
        </div>
      </div>

      <h5>Why It Was Written</h5>
      <p>
        <LinkedVerseText text={intro.whyWritten} {...linkHandlers} />
      </p>

      <h5>Summary</h5>
      {intro.summary.map((paragraph, i) => (
        <p key={i}>
          <LinkedVerseText text={paragraph} {...linkHandlers} />
        </p>
      ))}

      {intro.keyPassages.length > 0 && (
        <>
          <h5>Key Passages</h5>
          <div className="book-intro-key-passages">
            {intro.keyPassages.map((kp, i) => (
              <button type="button" key={i} onClick={() => onJumpToChapter(kp.chapter, kp.verse)}>
                <span>{kp.label}</span>
                <span className="book-intro-key-passage-ref">
                  {kp.chapter}
                  {kp.verse ? `:${kp.verse}` : ""}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <h5>Manuscripts &amp; Archaeological Evidence</h5>
      <ul className="book-intro-manuscripts">
        {intro.manuscripts.map((m, i) => (
          <li key={i}>
            <LinkedVerseText text={m} {...linkHandlers} />
          </li>
        ))}
      </ul>
    </div>
  );
}
