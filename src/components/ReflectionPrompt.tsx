interface ReflectionPromptProps {
  prompt: string;
  /** Primary Bible reference the journal note gets anchored to — the "Journal this" button only
   * renders when both this and onJournal are present, so logged-out readers (and POIs, which carry
   * no verse list) see the prompt alone. */
  reference?: string;
  onJournal?: (reference: string, prompt: string) => void;
}

/** Accent-bordered "Reflect" card shown in the details panels for entries that carry a
 * reflectionPrompt — "Journal this" jumps the reader to the entry's primary reference and opens
 * the note composer prefilled with the prompt (see App's handleJournalPrompt). */
export default function ReflectionPrompt({ prompt, reference, onJournal }: ReflectionPromptProps) {
  return (
    <div className="reflection-prompt">
      <h4>Reflect</h4>
      <p className="reflection-prompt-text">{prompt}</p>
      {reference && onJournal && (
        <button type="button" className="reflection-prompt-journal" onClick={() => onJournal(reference, prompt)}>
          ✎ Journal this
        </button>
      )}
    </div>
  );
}
