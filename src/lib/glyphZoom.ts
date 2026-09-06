/**
 * Does the text-size setting actually move the LETTERS, or only the space around them?
 *
 * The setting works by putting `zoom: var(--text-scale)` on each reading panel's root (see the
 * "Global text size" rule in App.css). `zoom` was chosen over `font-size` on purpose: it scales
 * padding, gaps and line boxes along with the type, so nothing overflows a fixed-size container.
 *
 * Reported from an iPhone: pressing A+ grew the space between the lines while the letters stayed
 * exactly the size they were. That is iOS/iPadOS WebKit's text autosizing. When `text-size-adjust`
 * is a percentage rather than `auto`, WebKit recomputes each element's font size as the SPECIFIED
 * size times that percentage — and that recomputation throws away the factor `zoom` had already
 * applied. Lengths keep the zoom; glyphs do not. index.css pins `-webkit-text-size-adjust: 100%`
 * on `:root` deliberately (without it Mobile Safari inflates small text inside narrow flex layouts
 * and `overflow: hidden` clips it), so on iOS the multiplier is nailed to 1 everywhere and the
 * letters never move. Handing the panel's own scale to `text-size-adjust` puts them back in step.
 *
 * WHY THIS IS A RUNTIME MEASUREMENT AND NOT A `@supports` FENCE.
 *
 * The correction is only correct on an engine that discards the zoom the way described above. On
 * an engine that does NOT — Blink is the measured example, and any future iOS WebKit that fixes
 * this bug is another — the percentage lands ON TOP of the zoom and the two MULTIPLY. Measured in
 * Chrome 148 at 375px with the rule unfenced: a 15px probe computes to 27px at scale 1.8 (15 x
 * 180%) and is then zoomed 1.8x again — 3.24x on the glyphs, 15px text rendering at 49px. That is
 * a far worse bug, on far more readers, than the one being fixed, and it is the single thing this
 * module exists to make impossible.
 *
 * A `@supports (-webkit-touch-callout: none)` fence excludes Blink, but it cannot tell an iOS that
 * has the bug from an iOS that has fixed it — it would keep applying the correction after Apple
 * ships the fix, and multiply on every reader who updated. So instead of asking the engine what it
 * is, this asks it what it DOES, on the reader's own device, and then checks its work:
 *
 *   1. Lay out the same line of prose twice, once plain and once inside `zoom: 1.8`, and compare
 *      the rendered advance width of a ruler span in each. Healthy engine: 1.8x. Afflicted engine:
 *      1.0x, because the glyphs never got the zoom.
 *   2. Only if the glyphs are lagging, apply the candidate correction to the zoomed copy and
 *      MEASURE AGAIN.
 *   3. Enable it for real only if that second measurement lands on 1.8x. If it overshoots (the
 *      multiply) or does not help, leave it off.
 *
 * Step 3 is the safety property. The correction ships only where it has been observed to produce
 * the intended size on that exact engine; everywhere else the attribute is never set, the CSS rule
 * never matches, and the app falls back to today's behaviour — the space scales and the letters do
 * not. That is the bug this fixes, and it is the correct thing to fail to. The failure direction
 * is never oversized text. Keep it that way round: do not set the attribute from a UA sniff, do
 * not set it unconditionally, and do not drop the confirmation re-measure in step 2-3.
 *
 * NOT VERIFIED ON REAL iOS. This machine has no iPhone and no iOS Simulator, and the underlying
 * bug cannot be reproduced in any browser available here. What IS verified is the safety property:
 * on every engine reachable here the probe returns "not-needed" and nothing changes, and when the
 * afflicted branch is forced on Blink the confirmation step rejects the 3.24x overshoot.
 */

/** Set on `<html>` when — and only when — the correction was measured to land on target. */
const FLAG_ATTRIBUTE = "data-zoom-text-fix";

/** The app's maximum text scale (TEXT_SCALE_MAX). Probing at the largest setting a reader can
 * actually choose keeps the measurement well clear of rounding noise. */
const PROBE_ZOOM = 1.8;

/** A real line of prose, not a lone word: iOS text autosizing only engages on something that looks
 * like a block of body text, so the probe has to look like one too. */
const SAMPLE = "Almighty God, unto whom all hearts be open, all desires known. ";

/** How far the measured ratio may sit from PROBE_ZOOM and still count as "the glyphs tracked the
 * zoom". Generous on the way in (step 1 only has to tell 1.0 apart from 1.8) and tight on the way
 * out (step 3 has to tell 1.8 apart from 3.24, but must not reject honest sub-pixel rounding). */
const TRACKING_TOLERANCE = 0.15;
const CONFIRM_TOLERANCE = 0.1;

interface Probe {
  block: HTMLDivElement;
  ruler: HTMLSpanElement;
}

/** One column of body text, sized and styled like the Bible panel's reading column. */
function buildProbe(zoom: number): Probe {
  const block = document.createElement("div");
  block.style.cssText =
    "width:340px;padding:18px;margin:0;font:15px/1.6 serif;" +
    (zoom === 1 ? "" : `zoom:${zoom};`);

  const body = document.createElement("p");
  body.style.cssText = "margin:0;";
  body.textContent = SAMPLE.repeat(8);

  // The thing actually measured. `white-space: pre` keeps it on one line so its width is a pure
  // glyph advance rather than a wrap position, which would quantise the measurement to whole words.
  const ruler = document.createElement("span");
  ruler.style.cssText = "white-space:pre;";
  ruler.textContent = SAMPLE;

  body.appendChild(document.createElement("br"));
  body.appendChild(ruler);
  block.appendChild(body);
  return { block, ruler };
}

export type GlyphZoomVerdict =
  /** The glyphs already track `zoom` on this engine. Nothing to do — the overwhelming majority. */
  | "not-needed"
  /** Glyphs lag the zoom AND the correction was measured to fix it. Attribute set. */
  | "applied"
  /** Glyphs lag the zoom but the correction did not land on target (it overshot, or did nothing).
   *  Attribute deliberately NOT set: today's bug is the safe place to land. */
  | "rejected"
  /** The probe could not get a usable measurement. Treated exactly like "rejected". */
  | "indeterminate";

/**
 * Measures whether `zoom` moves the glyphs on this engine and, if it does not, enables the
 * `text-size-adjust` correction — but only after confirming by measurement that the correction
 * produces the intended size rather than multiplying. Safe to call more than once; cheap enough
 * (two forced layouts of one offscreen paragraph) to call at startup.
 */
export function applyGlyphZoomCorrection(doc: Document = document): GlyphZoomVerdict {
  let host: HTMLDivElement | null = null;
  try {
    if (!doc.body) return "indeterminate";

    host = doc.createElement("div");
    host.setAttribute("aria-hidden", "true");
    // Laid out but invisible, and removed again before this task yields, so it never paints.
    // `opacity` rather than `visibility: hidden` or an offscreen position on purpose: WebKit's
    // text autosizing is a layout-time pass, and hidden or far-offscreen subtrees are exactly the
    // kind of thing an engine is entitled to skip. This one is on screen and laid out normally.
    host.style.cssText =
      "position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-2147483647;";

    const reference = buildProbe(1);
    const zoomed = buildProbe(PROBE_ZOOM);
    host.appendChild(reference.block);
    host.appendChild(zoomed.block);
    doc.body.appendChild(host);

    const referenceWidth = reference.ruler.getBoundingClientRect().width;
    if (!(referenceWidth > 0)) return "indeterminate";

    // Step 1 — does `zoom` move the letters at all?
    const trackedRatio = zoomed.ruler.getBoundingClientRect().width / referenceWidth;
    if (!(trackedRatio > 0)) return "indeterminate";
    if (trackedRatio >= PROBE_ZOOM - TRACKING_TOLERANCE) return "not-needed";

    // Step 2 — the glyphs are lagging. Try the correction on the probe, exactly as the CSS rule
    // would apply it to a panel root.
    zoomed.block.style.setProperty("-webkit-text-size-adjust", `${PROBE_ZOOM * 100}%`);
    const correctedRatio = zoomed.ruler.getBoundingClientRect().width / referenceWidth;

    // Step 3 — keep it only if it landed on target. Anything else, including the multiply, is
    // rejected and the reader keeps today's behaviour.
    if (Math.abs(correctedRatio - PROBE_ZOOM) > CONFIRM_TOLERANCE) return "rejected";

    doc.documentElement.setAttribute(FLAG_ATTRIBUTE, "on");
    return "applied";
  } catch {
    // A probe that throws must never take the app's first paint with it.
    return "indeterminate";
  } finally {
    host?.remove();
  }
}
