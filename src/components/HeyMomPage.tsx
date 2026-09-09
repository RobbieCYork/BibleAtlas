import { useEffect } from "react";
import "./HeyMomPage.css";

/** The photograph. Kept as a bare string constant, and referenced nowhere else, so that swapping
 * the picture is a file drop and not a code change: put the real photo at
 * `capstone-bible/public/heymom.jpg` and it is live on the next deploy.
 *
 * The layout below deliberately makes no assumption about its shape — see HeyMomPage.css. */
const PHOTO_SRC = "/heymom.jpg";

/** A single page at `/heymom`, and the only screen in this app that renders without an account.
 *
 * App.tsx returns this above `AuthGate` for exactly one pathname (see `isHeyMomPage` there); the
 * `?code=` password-recovery bypass alongside it is the same shape. It is a personal page — the
 * owner sends the link to his mother — so it carries no header, no tab bar, no sign-up prompt and
 * no way into the rest of the app. A card, not a landing page.
 *
 * Colours are written as literals rather than theme tokens for the same reason AuthGate.css pins
 * its own: this is a fixed piece of art with one intended look, and it should not flip to the
 * iron-gall palette because whoever opens the link once chose dark mode in the app. */
export default function HeyMomPage() {
  // The link most likely arrives in a text message, where the tab title is the first thing shown.
  useEffect(() => {
    const previous = document.title;
    document.title = "Hi Mom!";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <main className="heymom">
      <div className="heymom-card">
        <img
          className="heymom-photo"
          src={PHOTO_SRC}
          alt="A mother and her four sons"
          decoding="async"
        />
        <p className="heymom-caption">Hi Mom!</p>
      </div>
    </main>
  );
}
