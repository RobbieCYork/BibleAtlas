/** The inline "✎ Edit" editor MyNotesPanel and the reader's verse-note popup already use (see
 * commit c0ab47a), lifted into one component so the feeds can present the same thing: a textarea
 * prefilled with the saved text, Save/Cancel underneath, and any save failure shown beside them
 * with the typed text still on screen.
 *
 * The draft lives in the caller's state, not here — a failed save has to leave the editor open with
 * what the reader typed, which means the draft can't be owned by a component the caller might
 * unmount on success. */
interface InlineTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  /** Accessible name for the textarea — "Edit note" / "Edit post". */
  label: string;
  rows?: number;
  maxLength?: number;
}

export default function InlineTextEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  label,
  rows = 4,
  maxLength = 8000,
}: InlineTextEditorProps) {
  return (
    <div className="my-notes-edit no-print">
      <textarea
        className="my-notes-edit-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        aria-label={label}
        autoFocus
      />
      {error && <p className="my-notes-edit-error">{error}</p>}
      <div className="my-notes-edit-actions">
        <button type="button" className="my-notes-edit-save" onClick={onSave} disabled={!value.trim() || saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
