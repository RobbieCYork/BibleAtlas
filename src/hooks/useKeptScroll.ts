import { useLayoutEffect, useRef, type UIEvent } from "react";

/** Keeps a list's scroll offset across the panel being hidden (an article open over it, or another
 * mobile tab). A `display: none` element comes back scrolled to the top, so the offset is recorded
 * while the list is on screen and put back, before paint, when it reappears. `saved` is passed in so
 * that it can also outlive the list element itself. */
export function useKeptScroll<T extends HTMLElement>(
  saved: { current: number },
  hidden: boolean | undefined,
  remountKey?: unknown,
) {
  const ref = useRef<T | null>(null);
  useLayoutEffect(() => {
    if (!hidden && ref.current) ref.current.scrollTop = saved.current;
  }, [hidden, remountKey, saved]);
  const setRef = (el: T | null) => {
    ref.current = el;
  };
  const onScroll = (e: UIEvent<T>) => {
    // No height means the panel is hidden, and whatever offset it reports is not the reader's.
    if (e.currentTarget.clientHeight > 0) saved.current = e.currentTarget.scrollTop;
  };
  return { ref, setRef, onScroll };
}
