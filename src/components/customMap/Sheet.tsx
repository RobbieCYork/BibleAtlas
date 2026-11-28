import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** A panel over the builder: bottom of the screen on a phone, centred on a computer. */
export default function Sheet({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      before?.focus?.();
    };
  }, []);
  return (
    <div className="cm-sheet-backdrop" onClick={onClose}>
      <div className="cm-sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="cm-icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="cm-sheet-body">{children}</div>
        {footer && <div className="cm-sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
