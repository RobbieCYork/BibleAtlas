/* ============================================================================
 * Timeline layout: the fixed scale, the row sizes and the row packing.
 *
 * The timeline has ONE horizontal scale and no zoom, so which row every mark sits
 * in, and therefore how tall every band is, depends only on the data. It is worked
 * out once over the whole span and never changes with panning, searching or
 * jumping. Kept free of React so the numbers can be computed outside the app too.
 * ========================================================================== */

/** The only horizontal scale: five-year marks 195px apart, on every screen. */
export const PX_PER_YEAR = 39;
export const TICK_YEARS = 5;

/** The date-axis row under every band. */
export const AXIS_H = 22;

/** The pinned lane name chip, and the full-width strip each band reserves for it so that no mark can
 * ever sit underneath. LANE_LABEL_H must equal the .tl-lane-label height in TimelineView.css. */
export const LANE_LABEL_TOP = 3;
export const LANE_LABEL_H = 18;
const LANE_LABEL_GAP = 3;
export const LANE_LABEL_RESERVE = LANE_LABEL_TOP + LANE_LABEL_H + LANE_LABEL_GAP;

/** Event lanes: one row holds a marker dot or range bar and its two-line title pill (about 24px
 * tall, and the thing people tap). */
export const EVENT_ROW_H = 26;
/** Lifespans: one row, and the bar inside it (tall enough for its two-line label and to be tapped). */
export const LIFE_ROW_H = 28;
export const LIFE_BAR_H = 26;
/** Space above and below a band's rows, in total. */
export const ROW_PAD = 4;

/* What a mark paints around its year position. Keep in step with TimelineView.css. */

/** Half a marker dot, drawn to the left of its year. */
const MARKER_HALF_PX = 7;
/** From a marker's year to the right end of the widest title pill. */
const MARKER_LABEL_END_PX = 144;
/** A range bar is never drawn narrower than this. */
export const MIN_RANGE_BAR_PX = 12;
/** From a range bar's end to the right end of the widest title pill. */
const RANGE_LABEL_PX = 140;
/** A lifespan bar is never drawn narrower than this. */
const MIN_LIFE_BAR_PX = 6;
/** A lifespan bar wider than this carries its name inside; narrower ones put it to the right. */
export const LIFE_LABEL_INSIDE_PX = 72;
const LIFE_OUTSIDE_LABEL_PX = 130;
/** Clear space between two marks sharing a row. */
const ROW_GAP_PX = 2;

/** A mark's horizontal footprint in px, measured from year zero. */
export interface Extent {
  left: number;
  right: number;
}

export function eventExtent(startYear: number, endYear: number | undefined): Extent & { barW: number | null } {
  const x = startYear * PX_PER_YEAR;
  if (typeof endYear === "number" && endYear > startYear) {
    const barW = Math.max((endYear - startYear) * PX_PER_YEAR, MIN_RANGE_BAR_PX);
    return { left: x, right: x + barW + RANGE_LABEL_PX, barW };
  }
  return { left: x - MARKER_HALF_PX, right: x + MARKER_LABEL_END_PX, barW: null };
}

export function lifeExtent(bornYear: number, endYear: number): Extent & { barW: number } {
  const x = bornYear * PX_PER_YEAR;
  const barW = Math.max((endYear - bornYear) * PX_PER_YEAR, MIN_LIFE_BAR_PX);
  return { left: x, right: x + barW + (barW > LIFE_LABEL_INSIDE_PX ? 0 : LIFE_OUTSIDE_LABEL_PX), barW };
}

export interface Placed<T> {
  item: T;
  row: number;
  extent: Extent;
}

/** Greedy interval partitioning: puts each item, left to right, in the first row that is free. This
 * uses the fewest rows possible, which is the number of footprints overlapping at the most crowded
 * point, so a band has no spare row anywhere. */
export function packRows<T, E extends Extent>(
  items: T[],
  extentOf: (t: T) => E,
): { placed: { item: T; row: number; extent: E }[]; rowCount: number } {
  const sorted = items
    .map((item) => ({ item, extent: extentOf(item) }))
    .sort((a, b) => a.extent.left - b.extent.left || a.extent.right - b.extent.right);
  const rowEnds: number[] = [];
  const placed = sorted.map(({ item, extent }) => {
    let row = rowEnds.findIndex((end) => end + ROW_GAP_PX <= extent.left);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = extent.right;
    return { item, row, extent };
  });
  return { placed, rowCount: rowEnds.length };
}

/** A band's height: its name strip plus its rows. */
export function bandHeight(rowCount: number, rowH: number): number {
  return LANE_LABEL_RESERVE + Math.max(rowCount, 1) * rowH + ROW_PAD;
}
