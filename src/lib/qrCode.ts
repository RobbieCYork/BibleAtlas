/* ============================================================================
 * A QR Code encoder, byte mode, error-correction level M, versions 1–10.
 *
 * WHY THIS IS HERE RATHER THAN AN npm PACKAGE. A church's QR code is the
 * adoption mechanism for the whole Churches feature — it is how two hundred
 * people join on one Sunday morning — and it encodes exactly one kind of
 * string: this site's own origin with `?joinChurch=<uuid>` on the end. That is
 * eighty-odd ASCII characters, which is one mode (byte), one correction level,
 * and ten of the forty versions. A dependency would bring the other thirty-nine
 * versions, four modes, Kanji tables and a PNG writer to do it, and would put a
 * third-party package into the bundle of an app that ships to real users.
 *
 * WHAT IT IS NOT. No Kanji/alphanumeric/numeric modes (a URL gains nothing from
 * them), no levels L/Q/H, no versions above 10. `encodeQr` THROWS rather than
 * silently truncating when a string will not fit in version 10 at level M (213
 * bytes) — a QR that encodes half a URL scans cleanly and sends people nowhere,
 * which is far worse than no QR at all, so the caller is told.
 *
 * Everything below is ISO/IEC 18004. The tables are the standard's, transcribed
 * for versions 1–10 only; see QR_SPECS for where each row comes from.
 * ========================================================================== */

/** One version's structure at error-correction level M: how the data codewords
 * are split into Reed–Solomon blocks, and how many EC codewords each carries.
 *
 * `group2` is the standard's second block group — some versions split their data
 * into blocks of two different sizes, always differing by exactly one codeword.
 * ISO/IEC 18004 Table 9, level M rows, versions 1–10. */
interface VersionSpec {
  /** EC codewords per block. */
  ecPerBlock: number;
  /** [block count, data codewords per block] for the first (smaller) group. */
  group1: [number, number];
  /** Same for the second group; [0, 0] when the version does not have one. */
  group2: [number, number];
}

const QR_SPECS: Record<number, VersionSpec> = {
  1: { ecPerBlock: 10, group1: [1, 16], group2: [0, 0] },
  2: { ecPerBlock: 16, group1: [1, 28], group2: [0, 0] },
  3: { ecPerBlock: 26, group1: [1, 44], group2: [0, 0] },
  4: { ecPerBlock: 18, group1: [2, 32], group2: [0, 0] },
  5: { ecPerBlock: 24, group1: [2, 43], group2: [0, 0] },
  6: { ecPerBlock: 16, group1: [4, 27], group2: [0, 0] },
  7: { ecPerBlock: 18, group1: [4, 31], group2: [0, 0] },
  8: { ecPerBlock: 22, group1: [2, 38], group2: [2, 39] },
  9: { ecPerBlock: 22, group1: [3, 36], group2: [2, 37] },
  10: { ecPerBlock: 26, group1: [4, 43], group2: [1, 44] },
};

/** Alignment-pattern centre coordinates, ISO/IEC 18004 Annex E, versions 1–10.
 * Version 1 has none. A pattern is skipped where it would collide with a finder. */
const ALIGNMENT_CENTERS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const MAX_VERSION = 10;

/* --------------------------------------------------------------------------
 * GF(256), primitive polynomial 0x11D — the field Reed–Solomon runs in.
 * ------------------------------------------------------------------------ */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** The RS generator polynomial of the given degree, coefficients high-order first. */
function generatorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], 1);
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** The `ecLength` error-correction codewords for one block of data codewords. */
function reedSolomon(data: number[], ecLength: number): number[] {
  const gen = generatorPoly(ecLength);
  const remainder = new Array<number>(ecLength).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    if (factor !== 0) {
      for (let i = 0; i < ecLength; i++) {
        remainder[i] ^= gfMul(gen[i + 1], factor);
      }
    }
  }
  return remainder;
}

/* --------------------------------------------------------------------------
 * Bit stream
 * ------------------------------------------------------------------------ */

class BitBuffer {
  readonly bits: number[] = [];
  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
}

/* --------------------------------------------------------------------------
 * Format and version information (BCH-protected)
 * ------------------------------------------------------------------------ */

/** 15 bits: two bits of EC level (M = 00), three of mask, ten of BCH(15,5)
 * parity, the whole thing XORed with 0x5412 so an all-zero payload is not an
 * all-zero pattern. */
function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask; // level M
  let value = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((value >>> (i + 10)) & 1) value ^= 0x537 << i;
  }
  return ((data << 10) | value) ^ 0x5412;
}

/** 18 bits: six of version, twelve of BCH(18,6). Only present from version 7. */
function versionBits(version: number): number {
  let value = version << 12;
  for (let i = 5; i >= 0; i--) {
    if ((value >>> (i + 12)) & 1) value ^= 0x1f25 << i;
  }
  return (version << 12) | value;
}

/* --------------------------------------------------------------------------
 * The matrix
 * ------------------------------------------------------------------------ */

type Grid = (boolean | null)[][];

function placeFinder(grid: Grid, reserved: boolean[][], row: number, col: number) {
  // The 7×7 finder plus its one-module separator, written as an 8×8 (or 9×9 at
  // the corners) region so the separator is reserved even where it runs off the
  // symbol and is simply skipped.
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= grid.length || cc < 0 || cc >= grid.length) continue;
      const onRing = (r === 0 || r === 6) && c >= 0 && c <= 6;
      const onSide = (c === 0 || c === 6) && r >= 0 && r <= 6;
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[rr][cc] = onRing || onSide || inCore;
      reserved[rr][cc] = true;
    }
  }
}

function buildMatrix(version: number, codewords: number[], mask: number): boolean[][] {
  const size = version * 4 + 17;
  const grid: Grid = Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  placeFinder(grid, reserved, 0, 0);
  placeFinder(grid, reserved, 0, size - 7);
  placeFinder(grid, reserved, size - 7, 0);

  // Timing patterns, row 6 and column 6, between the finders.
  for (let i = 8; i < size - 8; i++) {
    const on = i % 2 === 0;
    grid[6][i] = on;
    reserved[6][i] = true;
    grid[i][6] = on;
    reserved[i][6] = true;
  }

  // Alignment patterns, at every pair of centres except the three that would sit
  // on a finder.
  const centers = ALIGNMENT_CENTERS[version];
  for (const r of centers) {
    for (const c of centers) {
      const nearFinder =
        (r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6);
      if (nearFinder) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          grid[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          reserved[r + dr][c + dc] = true;
        }
      }
    }
  }

  // The dark module — always set, always here.
  grid[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // Reserve the two format-information strips before any data is placed.
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  // …and the version-information blocks, from version 7 up.
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const r = Math.floor(i / 3);
      const c = size - 11 + (i % 3);
      reserved[r][c] = true;
      reserved[c][r] = true;
    }
  }

  // Data, in the standard two-module-wide upward/downward zigzag from the
  // bottom-right, skipping the vertical timing column entirely.
  const bits: number[] = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
  }
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (let k = 0; k < 2; k++) {
        const col = right - k;
        if (reserved[row][col]) continue;
        // Past the end of the stream the remaining modules are the version's
        // remainder bits, which are zero by definition.
        const bit = bitIndex < bits.length ? bits[bitIndex++] === 1 : false;
        grid[row][col] = bit !== maskAt(mask, row, col);
      }
    }
    upward = !upward;
  }

  // Format information, written twice — the vertical copy beside the top-left
  // and bottom-left finders, the horizontal copy along row 8. The index
  // arithmetic is the standard's and is not rearrangeable: bit 6 skips the
  // timing module at row 6, and the horizontal copy's bit 8 lands at column 7
  // for the same reason.
  const fmt = formatBits(mask);
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >>> i) & 1) === 1;
    if (i < 6) grid[i][8] = bit;
    else if (i < 8) grid[i + 1][8] = bit;
    else grid[size - 15 + i][8] = bit;
  }
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >>> i) & 1) === 1;
    if (i < 8) grid[8][size - i - 1] = bit;
    else if (i < 9) grid[8][15 - i] = bit;
    else grid[8][14 - i] = bit;
  }

  if (version >= 7) {
    const ver = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((ver >>> i) & 1) === 1;
      const r = Math.floor(i / 3);
      const c = size - 11 + (i % 3);
      grid[r][c] = bit;
      grid[c][r] = bit;
    }
  }

  return grid.map((row) => row.map((cell) => cell === true));
}

/** The eight standard mask conditions. True means "invert this module". */
function maskAt(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

/** ISO/IEC 18004 §8.8.2's four penalty rules. Lower is a more scannable symbol. */
function penalty(grid: boolean[][]): number {
  const size = grid.length;
  let score = 0;

  // Rule 1 — runs of five or more of the same colour, in both directions.
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const cur = pass === 0 ? grid[a][b] : grid[b][a];
        const prev = pass === 0 ? grid[a][b - 1] : grid[b - 1][a];
        if (cur === prev) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else run = 1;
      }
    }
  }

  // Rule 2 — every 2×2 block of one colour.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  }

  // Rule 3 — the 1:1:3:1:1 finder-lookalike with four light modules on a side.
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < size; a++) {
      for (let b = 0; b + 11 <= size; b++) {
        let m1 = true;
        let m2 = true;
        for (let k = 0; k < 11; k++) {
          const v = pass === 0 ? grid[a][b + k] : grid[b + k][a];
          if (v !== p1[k]) m1 = false;
          if (v !== p2[k]) m2 = false;
        }
        if (m1) score += 40;
        if (m2) score += 40;
      }
    }
  }

  // Rule 4 — deviation from a half-dark symbol.
  let dark = 0;
  for (const row of grid) for (const cell of row) if (cell) dark++;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/* --------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------ */

/** How many bytes fit in one version at level M, byte mode. */
function byteCapacity(version: number): number {
  const spec = QR_SPECS[version];
  const dataCodewords = spec.group1[0] * spec.group1[1] + spec.group2[0] * spec.group2[1];
  // 4 bits of mode indicator plus the character-count indicator, which is 8 bits
  // below version 10 and 16 bits from version 10 up.
  const headerBits = 4 + (version >= 10 ? 16 : 8);
  return Math.floor((dataCodewords * 8 - headerBits) / 8);
}

/** The finished symbol: `modules[row][col]`, true where the module is dark. */
export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * Encodes `text` as a QR symbol at error-correction level M.
 *
 * THROWS when the string does not fit in version 10 (213 bytes). Deliberately —
 * see this file's header. A caller with a string that long has a bug, not a
 * display problem.
 */
export function encodeQr(text: string): QrMatrix {
  const bytes = Array.from(new TextEncoder().encode(text));

  let version = 0;
  for (let v = 1; v <= MAX_VERSION; v++) {
    if (bytes.length <= byteCapacity(v)) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    throw new Error(
      `qrCode: ${bytes.length} bytes will not fit in a version-${MAX_VERSION} symbol at level M (max ${byteCapacity(MAX_VERSION)}).`
    );
  }

  const spec = QR_SPECS[version];
  const dataCodewords = spec.group1[0] * spec.group1[1] + spec.group2[0] * spec.group2[1];

  const buffer = new BitBuffer();
  buffer.put(0b0100, 4); // byte mode
  buffer.put(bytes.length, version >= 10 ? 16 : 8);
  for (const b of bytes) buffer.put(b, 8);
  // Terminator, up to four bits, then pad to a byte boundary.
  const capacityBits = dataCodewords * 8;
  for (let i = 0; i < 4 && buffer.bits.length < capacityBits; i++) buffer.bits.push(0);
  while (buffer.bits.length % 8 !== 0) buffer.bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < buffer.bits.length; i += 8) {
    let byte = 0;
    for (let k = 0; k < 8; k++) byte = (byte << 1) | buffer.bits[i + k];
    data.push(byte);
  }
  // The standard's alternating pad bytes, to the end of the data capacity.
  const PADS = [0xec, 0x11];
  for (let i = 0; data.length < dataCodewords; i++) data.push(PADS[i % 2]);

  // Split into blocks, compute EC for each, then interleave — data codewords
  // first (block 0 byte 0, block 1 byte 0, …), then EC codewords the same way.
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;
  for (const [count, size] of [spec.group1, spec.group2]) {
    for (let i = 0; i < count; i++) {
      const chunk = data.slice(offset, offset + size);
      offset += size;
      blocks.push({ data: chunk, ec: reedSolomon(chunk, spec.ecPerBlock) });
    }
  }

  const interleaved: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const block of blocks) if (i < block.data.length) interleaved.push(block.data[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const block of blocks) interleaved.push(block.ec[i]);
  }

  // Any of the eight masks produces a decodable symbol as long as the format
  // information says which one was used; the penalty score picks the one that
  // scans most reliably.
  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = buildMatrix(version, interleaved, mask);
    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const modules = best as boolean[][];
  return { size: modules.length, modules };
}

/**
 * The same symbol as a standalone `<svg>` string, drawn as one `<path>` of
 * 1×1 squares on a light ground.
 *
 * `quietZone` is in modules and defaults to the standard's 4. Dropping it is the
 * single most common reason a QR on a printed bulletin will not scan, so it is a
 * parameter with a correct default rather than something each caller remembers.
 *
 * Colours are literal, not CSS variables: this markup is meant to survive being
 * printed, screenshotted, and pasted into a church's slide deck, none of which
 * carry the app's stylesheet — and a QR inverted by a dark theme does not scan
 * on most phones.
 */
export function qrSvg(text: string, quietZone = 4): string {
  const { size, modules } = encodeQr(text);
  const total = size + quietZone * 2;
  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) path += `M${c + quietZone} ${r + quietZone}h1v1h-1z`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`
  );
}
