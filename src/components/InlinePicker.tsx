import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface PickerHandle {
  open: () => void;
  close: () => void;
}

export interface PickerOption {
  value: string;
  label: string;
}

interface InlinePickerProps {
  ariaLabel: string;
  value: string;
  placeholder: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/** A button + custom dropdown list standing in for a native <select>, specifically so a selection
 * here can programmatically open the NEXT picker in a chain (Book -> Chapter -> Verse). Native
 * <select> elements have no cross-browser way to do that — iOS Safari in particular only opens its
 * wheel picker in direct response to a user tap on the element itself, never from JS. */
const InlinePicker = forwardRef<PickerHandle, InlinePickerProps>(
  ({ ariaLabel, value, placeholder, options, onSelect, disabled, className }, ref) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    // No `disabled` guard here: callers only ever call `open()` right after making `disabled` go
    // false themselves (e.g. selecting a book, which is what un-disables the chapter picker) — at
    // that moment this closure is still holding the *previous* render's now-stale `disabled` value,
    // since React hasn't re-rendered yet. A disabled *user* click can't reach this at all, since a
    // native `disabled` button never fires click events in the first place.
    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }));

    useEffect(() => {
      if (!open) return;
      const handleClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    // Jump the selected option into view on open, so a book/chapter far down a long list doesn't
    // force a long manual scroll every time the picker is reopened.
    useEffect(() => {
      if (!open || !listRef.current) return;
      const selected = listRef.current.querySelector('[aria-selected="true"]');
      selected?.scrollIntoView({ block: "center" });
    }, [open]);

    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
      <div className={`inline-picker ${className ?? ""}`} ref={containerRef}>
        <button
          type="button"
          className="inline-picker-trigger"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={selectedLabel ? "" : "inline-picker-placeholder"}>{selectedLabel ?? placeholder}</span>
          <span className="inline-picker-caret" aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <ul className="inline-picker-list" role="listbox" ref={listRef}>
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className={o.value === value ? "active" : ""}
                  onClick={() => {
                    setOpen(false);
                    onSelect(o.value);
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
InlinePicker.displayName = "InlinePicker";

export default InlinePicker;
