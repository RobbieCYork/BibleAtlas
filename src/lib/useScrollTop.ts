import { useLayoutEffect, useRef } from "react";

/** For a game's scrolling area, which React keeps from one screen to the next: goes back to the top
 * whenever `screen` changes, so a new screen or round never opens where the last one was scrolled to.
 * A layout effect, so anything that then scrolls its own content into view still gets the last word. */
export function useScrollTop(screen: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [screen]);
  return ref;
}
