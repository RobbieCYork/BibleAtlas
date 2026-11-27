import { useEffect, useRef, type ReactNode } from "react";
import "./HowToPlay.css";

interface HowToPlayProps {
  /** True the first time, when the button starts the game rather than returning to it. */
  firstTime: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** The "How to play" panel. It takes the board's place inside the game screen (so the header and the
 * tab bar stay where they are) and its button is pinned to the bottom, visible without scrolling. */
export default function HowToPlay({ firstTime, onClose, children }: HowToPlayProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="game-body how-body">
      <section className="how-panel" aria-labelledby="how-heading">
        <h3 id="how-heading" ref={heading} tabIndex={-1}>
          How to play
        </h3>
        {children}
      </section>
      <div className="how-foot">
        <button type="button" className="games-primary-button how-close" onClick={onClose}>
          {firstTime ? "Start playing" : "Back to the game"}
        </button>
      </div>
    </div>
  );
}

/** The header button that reopens the panel. */
export function HowToPlayButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="how-open" onClick={onClick}>
      How to play
    </button>
  );
}
