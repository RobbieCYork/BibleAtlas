// Compares two snapshots and classifies every occurrence that moved.
//   node scripts/name-linker/tally.mjs <old.tsv> <new.tsv>
//
// Works on BOTH row-level snapshots, and works out which it is from the shape of the file:
//
//   bible-links.tsv   5 fields   ref \t start \t text \t reader-id \t panel-id
//   prose-links.tsv   4 fields   blockKey \t start \t text \t id
//
// It used to assume five fields unconditionally. Handed a prose snapshot, `panel` came back
// undefined on every row, so it reported "panel: 0 repointed, 0 removed, 0 newly linked" — a
// confident tally of a column that does not exist. Numbers from that path reached a commit message.
// Now the shape is detected, mixed files are refused, and prose output says "prose", not "reader".
//
// Occurrences are keyed by their row identity plus start offset, so a link that merely grew to
// cover a longer phrase ("James" -> "James the son of Alphaeus") is followed rather than counted as
// one loss and one gain.
//
// CAVEAT for prose: rows are keyed by a hash of the block's own text (see corpus.mjs), so EDITING a
// paragraph re-keys every link in it, and they show up as removed-and-added rather than moved. That
// is correct — they are different text — but it means a tally across a prose edit overstates churn.
// Read the run.mjs diff for those, not this.
import fs from "node:fs";

function load(file) {
  const lines = fs.readFileSync(file, "utf8").trimEnd().split("\n").filter(Boolean);
  if (!lines.length) return { kind: "empty", rows: new Map() };
  const widths = new Set(lines.map((l) => l.split("\t").length));
  if (widths.size > 1) {
    console.error(`${file}: rows have ${[...widths].sort().join(" and ")} fields — not a snapshot this tool can read.`);
    process.exit(2);
  }
  const width = [...widths][0];
  if (width !== 4 && width !== 5) {
    console.error(`${file}: rows have ${width} fields; expected 5 (bible-links) or 4 (prose-links).`);
    process.exit(2);
  }
  const rows = new Map();
  for (const line of lines) {
    const f = line.split("\t");
    rows.set(`${f[0]}@${f[1]}`, width === 5
      ? { reader: f[3], panel: f[4] }
      : { prose: f[3] });
  }
  return { kind: width === 5 ? "bible" : "prose", rows };
}

const [oldFile, newFile] = process.argv.slice(2);
if (!oldFile || !newFile) {
  console.error("usage: node scripts/name-linker/tally.mjs <old.tsv> <new.tsv>");
  process.exit(2);
}
const a = load(oldFile), b = load(newFile);
const kind = a.kind === "empty" ? b.kind : a.kind;
if (a.kind !== "empty" && b.kind !== "empty" && a.kind !== b.kind) {
  console.error(`${oldFile} is a ${a.kind} snapshot and ${newFile} is a ${b.kind} snapshot — refusing to compare.`);
  process.exit(2);
}

const paths = kind === "prose" ? ["prose"] : ["reader", "panel"];
const t = Object.fromEntries(paths.map((p) => [p, { changed: 0, gained: 0, lost: 0 }]));
for (const key of new Set([...a.rows.keys(), ...b.rows.keys()])) {
  const o = a.rows.get(key), n = b.rows.get(key);
  for (const path of paths) {
    const ov = o ? (o[path] === "-" ? null : o[path]) : null;
    const nv = n ? (n[path] === "-" ? null : n[path]) : null;
    if (ov === nv) continue;
    if (ov && nv) t[path].changed++;
    else if (nv) t[path].gained++;
    else t[path].lost++;
  }
}
for (const path of paths) {
  const { changed, lost, gained } = t[path];
  console.log(`${(path + ":").padEnd(8)} ${changed} repointed, ${lost} removed, ${gained} newly linked`);
}
