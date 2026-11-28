/* Where each name goes so that no two overlap. Pure geometry: no canvas, no map. */
import type { Point } from "./geometry";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LabelRequest {
  /** The pin (or dot) the name belongs to; names never cover any pin. */
  pin: Box;
  /** Where a leader line starts, and the height side labels sit at. */
  anchor: Point;
  w: number;
  h: number;
}

export interface LabelPlacement {
  box: Box;
  /** Set when the name had to move away from its pin: draw a line from the anchor to here. */
  leader: Point | null;
  /** True only when there was no free space anywhere in reach. */
  crowded: boolean;
}

const GAPS = [3, 14, 28, 46, 68, 94, 126, 164, 210, 270, 345, 430, 530];
/* Preferred directions first (beside, above, below, corners), then the gaps between them. */
const ANGLES = [
  0, 180, -90, 90, -35, 35, -145, 145, -62, 62, -118, 118, -15, 15, 165, -165,
  -50, 50, -130, 130, -75, 75, -105, 105, -25, 25, -155, 155,
];
/** A leader line that runs under another name costs this much extra distance. */
const CROSSING_COST = 200;

const overlap = (a: Box, b: Box, gap: number) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) + gap - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) + gap - Math.max(a.y, b.y));

/** Liang–Barsky: does the segment pass through the box? */
function crosses(from: Point, to: Point, box: Box): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, from.x - box.x],
    [dx, box.x + box.w - from.x],
    [-dy, from.y - box.y],
    [dy, box.y + box.h - from.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

const nearest = (from: Point, box: Box): Point => ({
  x: Math.min(Math.max(from.x, box.x), box.x + box.w),
  y: Math.min(Math.max(from.y, box.y), box.y + box.h),
});

export function placeLabels(requests: LabelRequest[], width: number, height: number, ui: number): LabelPlacement[] {
  const edge = 4 * ui;
  const placed: (LabelPlacement & { from: Point })[] = [];
  const out: LabelPlacement[] = new Array(requests.length);
  // The most hemmed-in pins choose first; ties keep list order.
  const crowding = requests.map((r) =>
    requests.reduce((n, o) => n + (Math.hypot(o.anchor.x - r.anchor.x, o.anchor.y - r.anchor.y) < 130 * ui ? 1 : 0), 0)
  );
  const order = requests.map((_, i) => i).sort((a, b) => crowding[b] - crowding[a] || a - b);

  for (const i of order) {
    const r = requests[i];
    const cx = r.pin.x + r.pin.w / 2;
    const inside = (b: Box) => b.x >= edge && b.y >= edge && b.x + b.w <= width - edge && b.y + b.h <= height - edge;
    const candidate = (angle: number, gap: number): Box => {
      const rad = (angle * Math.PI) / 180;
      const ox = cx + Math.cos(rad) * (r.pin.w / 2 + r.w / 2 + gap);
      // Side names sit level with the anchor; the rest clear the whole pin.
      const level = Math.abs(Math.sin(rad)) < 0.01;
      const oy = level
        ? r.anchor.y
        : (Math.sin(rad) < 0 ? r.pin.y : r.pin.y + r.pin.h) + Math.sin(rad) * (r.h / 2 + gap);
      return { x: ox - r.w / 2, y: oy - r.h / 2, w: r.w, h: r.h };
    };
    const free = (b: Box) =>
      inside(b) &&
      placed.every((p) => overlap(b, p.box, 4 * ui) === 0) &&
      requests.every((o) => overlap(b, o.pin, 2 * ui) === 0);
    const crossings = (b: Box) => {
      const to = nearest(r.anchor, b);
      return placed.reduce(
        (n, p) => n + (crosses(r.anchor, to, p.box) ? 1 : 0) + (p.leader && crosses(p.from, p.leader, b) ? 1 : 0),
        0
      );
    };

    // The nearest free spot, counting a tangled leader line as extra distance.
    let found: { box: Box; gap: number } | null = null;
    let cost = Infinity;
    for (const g of GAPS) {
      if (g >= cost) break;
      for (const angle of ANGLES) {
        const box = candidate(angle, g * ui);
        if (!free(box)) continue;
        const score = g + crossings(box) * CROSSING_COST;
        if (score < cost) {
          cost = score;
          found = { box, gap: g };
        }
        if (score === g) break;
      }
    }
    let crowded = false;
    if (!found) {
      // Nowhere free: take the least covered spot on the map, clamped inside the edges.
      crowded = true;
      let best = Infinity;
      for (const g of GAPS) {
        for (const angle of ANGLES) {
          const box = candidate(angle, g * ui);
          box.x = Math.min(Math.max(box.x, edge), width - edge - box.w);
          box.y = Math.min(Math.max(box.y, edge), height - edge - box.h);
          const cover =
            placed.reduce((n, p) => n + overlap(box, p.box, 0) * 3, 0) +
            requests.reduce((n, o) => n + overlap(box, o.pin, 0), 0);
          if (cover < best) {
            best = cover;
            found = { box, gap: g };
          }
        }
      }
    }
    const { box, gap } = found!;
    const placement = { box, leader: gap > 10 ? nearest(r.anchor, box) : null, crowded };
    placed.push({ ...placement, from: r.anchor });
    out[i] = placement;
  }
  return out;
}
