import { lazy } from "react";

/** The builder is loaded only when someone opens it. A download that fails says so instead of taking
 * the app down with it; reloading fetches the current version. */
export default lazy(() =>
  import("./CustomMapBuilder").catch(() => ({
    default: function LoadFailed({ onClose }: { userId: string; onClose: () => void }) {
      return (
        <div role="alertdialog" aria-label="Custom map" className="cm-load-failed">
          <p>The map builder couldn't be loaded. Check your connection, then reload the page.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      );
    },
  }))
);
