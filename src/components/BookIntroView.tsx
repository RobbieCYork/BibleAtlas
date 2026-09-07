import { bookIntros } from "../data/bookIntros";
import { bookIntroOwnerId } from "../lib/verseAnnotations";
import LinkedVerseText from "./LinkedVerseText";
import BackButton from "./BackButton";

interface BookIntroViewProps {
  book: string;
  onJumpToChapter: (chapter: number, verse?: number) => void;
  /** Set only when this book's Introduction was opened from the Timeline's Books-of-the-Bible band
   * (its only entry point today) — renders a "Back to Timeline" affordance that restores the
   * Timeline view the reader left, via App's detailsHistory back-trail (see goBackInDetails). */
  onBack?: () => void;
  /** Opens the reference picker. Set from BiblePanel, where the intro is one of the surfaces the
   * picker can land on: with the book/chapter dropdown row gone, this heading is the only way off
   * an introduction other than the back trail, and a reader who arrived here from the Timeline may
   * not have one. Left optional so other callers can render the intro without a picker to open. */
  onChangePassage?: () => void;
  /** Same auto-linking callbacks PersonPanel/TopicPanel/TimelineEventPanel already use — book intro
   * prose (e.g. Genesis's mentions Abraham, Moses, Egypt) links the same way theirs does. */
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectTopic: (id: string) => void;
}

export default function BookIntroView({ book, onJumpToChapter, onBack, onChangePassage, onSelectLocation, onSelectPoi, onSelectPerson, onSelectTopic }: BookIntroViewProps) {
  /** `excludeId` is how every other authored surface tells the linker whose article the text is —
   * PersonPanel passes `person.id`, TimelineEventPanel `event.id`. An introduction has no record,
   * so it passes a synthesised id instead ("book-intro:Zechariah"); see `bookIntroOwnerId`. It is
   * the ONLY context this surface has, and without it OWNER_NAME_OVERRIDES could not correct a
   * single ambiguous name in any of the 66 introductions. Passing it moves no link on its own — no
   * real record id contains a colon, so nothing is excluded and nothing is overridden until an
   * entry is written against the key. */
  const linkHandlers = { onSelectLocation, onSelectPoi, onSelectPerson, onSelectTopic, excludeId: bookIntroOwnerId(book) };
  const intro = bookIntros.find((b) => b.book === book);

  /** The intro's heading, doubling as the reference picker's trigger when there is one — the same
   * control the chapter heading uses, so the two surfaces open the picker the same way. */
  const heading = (text: string) =>
    onChangePassage ? (
      <h4 className="bible-passage-title">
        <button
          type="button"
          className="bible-passage-title-btn"
          onClick={onChangePassage}
          aria-haspopup="dialog"
          aria-label={`${text} — choose a different book or chapter`}
        >
          <span>{text}</span>
          <span className="bible-passage-title-caret" aria-hidden="true">
            ▾
          </span>
        </button>
      </h4>
    ) : (
      <h4>{text}</h4>
    );

  if (!intro) {
    return (
      <div className="book-intro">
        {onBack && (
          <div className="panel-back-row">
            <BackButton onClick={onBack} label="Back to Timeline" />
          </div>
        )}
        {heading(`${book} — Introduction`)}
        <p className="bible-status">No introduction available for this book yet.</p>
      </div>
    );
  }

  return (
    <div className="book-intro">
      {onBack && (
        <div className="panel-back-row">
          <BackButton onClick={onBack} label="Back to Timeline" />
        </div>
      )}
      {heading(`${intro.book} — Introduction`)}

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
