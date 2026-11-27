import { useCallback, useState } from "react";

/* A game's "How to play" panel (components/HowToPlay.tsx): shown by itself the first time someone
 * reaches the board on this device, and again whenever they ask for it. Kept on the device only,
 * like the rest of these games' records. If storage is blocked the panel still closes; it just
 * comes back the next time the game is opened. */

function readSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function useHowToPlay(storageKey: string) {
  const [seen, setSeen] = useState(() => readSeen(storageKey));
  const [asked, setAsked] = useState(false);

  const show = useCallback(() => setAsked(true), []);
  const close = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* Storage blocked — see the note above. */
    }
    setSeen(true);
    setAsked(false);
  }, [storageKey]);

  return { open: asked || !seen, firstTime: !seen, show, close };
}
