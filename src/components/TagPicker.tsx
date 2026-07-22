import type { Tag } from "../lib/supabase";

interface TagPickerProps {
  /** Every tag the account has ever created, alphabetically sorted — the "rolling list" of previously used tags. */
  tags: Tag[];
  isActive: (tagId: string) => boolean;
  onToggle: (tagId: string) => void;
  newTagName: string;
  onNewTagNameChange: (value: string) => void;
  onAddNewTag: () => void;
}

export default function TagPicker({ tags, isActive, onToggle, newTagName, onNewTagNameChange, onAddNewTag }: TagPickerProps) {
  return (
    <div className="tag-picker">
      {tags.length > 0 && (
        <div className="tag-picker-chips">
          {tags.map((tag) => {
            const active = isActive(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={`tag-picker-chip ${active ? "tag-picker-chip-active" : ""}`}
                onClick={() => onToggle(tag.id)}
              >
                {active ? "✓ " : ""}
                {tag.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="tag-picker-new">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => onNewTagNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddNewTag();
            }
          }}
          placeholder="New tag name…"
        />
        <button type="button" onClick={onAddNewTag} disabled={!newTagName.trim()}>
          + Add
        </button>
      </div>
    </div>
  );
}
