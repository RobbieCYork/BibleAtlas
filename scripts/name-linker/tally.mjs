// Compares two bible-links snapshots and classifies every occurrence that moved, per rendering path.
//   node scripts/name-linker/tally.mjs <old.tsv> <new.tsv>
// Occurrences are keyed by reference + start offset, so a link that merely grew to cover a longer
// phrase ("James" -> "James the son of Alphaeus") is followed rather than counted as a loss.
import fs from "node:fs";
const load = (f) => {
  const m = new Map();
  for (const line of fs.readFileSync(f, "utf8").trimEnd().split("\n")) {
    const [ref, start, text, reader, panel] = line.split("\t");
    m.set(`${ref}@${start}`, { ref, start, text, reader, panel });
  }
  return m;
};
const [a, b] = [load(process.argv[2]), load(process.argv[3])];
const keys = new Set([...a.keys(), ...b.keys()]);
const t = { readerChanged: 0, readerGained: 0, readerLost: 0, panelChanged: 0, panelGained: 0, panelLost: 0 };
for (const k of keys) {
  const o = a.get(k), n = b.get(k);
  for (const [path, tag] of [["reader", "reader"], ["panel", "panel"]]) {
    const ov = o ? (o[path] === "-" ? null : o[path]) : null;
    const nv = n ? (n[path] === "-" ? null : n[path]) : null;
    if (ov === nv) continue;
    if (ov && nv) t[tag + "Changed"]++;
    else if (nv) t[tag + "Gained"]++;
    else t[tag + "Lost"]++;
  }
}
console.log(`reader:  ${t.readerChanged} repointed, ${t.readerLost} removed, ${t.readerGained} newly linked`);
console.log(`panel:   ${t.panelChanged} repointed, ${t.panelLost} removed, ${t.panelGained} newly linked`);
