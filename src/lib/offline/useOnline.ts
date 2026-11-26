import { useSyncExternalStore } from "react";

function subscribe(l: () => void) {
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
}

/** False only when the device itself says it has no connection. A connection that is merely not
 * working still reads true, so every network call keeps its own failure handling. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
