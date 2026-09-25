// Every link a record's own prose renders, listed one at a time, so a person can read them.
//
// Built 2026-09-10, on the recommendation of the papyri-and-uncials batch. Its link census found
// 21 wrong links the snapshot could not see, because a NEW article's links arrive in the snapshot
// diff as rows that were not there before — indistinguishable from the good links the article
// brings with it. Fourteen of the 21 were a bare "John" resolving to the Baptist from sentences
// about the Fourth Gospel. `modern-names.mjs` cannot see those: it only looks inside modern
// personal names, and "John" is not one.
//
// So this asks the third question neither of the others asks — not "did anything move?" and not
// "is a link inside a modern name?" but simply "what does this record link to, in order, in the
// words a reader will actually see?" — and prints it for reading. Enumerate before you commit; it
// is much cheaper than reading it out of a snapshot diff afterwards, and it is the only one of the
// three that surfaces a link that is wrong on its own terms.
//
//   node scripts/name-linker/links-for.mjs aleppo-codex cairo-geniza     one or more record ids
//   node scripts/name-linker/links-for.mjs "book-intro:Psalms"           a book introduction
//   node scripts/name-linker/links-for.mjs --book-intros                 all 66, manuscripts field
//   node scripts/name-linker/links-for.mjs --grep "Samaritan Pentateuch" every block naming it
//   node scripts/name-linker/links-for.mjs aleppo-codex --kind person    one annotation kind
//
// Owners are the ids `loadProseBlocks()` reports: a record id for a data record, and the
// synthesised `book-intro:<Book>` for a book introduction.

import { loadProseBlocks } from "./corpus.mjs";
import { loadLinker } from "./loadLinker.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1] ?? "";
};
const grep = flag("--grep");
const kind = flag("--kind");
const allIntros = argv.includes("--book-intros");
const owners = new Set(argv.filter((a) => !a.startsWith("--") && a !== grep && a !== kind));

const { computeLinkAnnotations } = await loadLinker();
const blocks = await loadProseBlocks();
const re = grep ? new RegExp(grep, "i") : null;

const wanted = blocks.filter((b) => {
  if (re && !re.test(b.text)) return false;
  if (allIntros && b.src.startsWith("bookIntro.")) return true;
  if (owners.size && owners.has(b.owner)) return true;
  return !owners.size && !allIntros && !!re;
});

if (!wanted.length) {
  console.error("No blocks matched. Give record ids, --book-intros, or --grep <pattern>.");
  process.exit(1);
}

let links = 0;
let lastOwner = null;
for (const b of wanted) {
  const anns = computeLinkAnnotations(b.text, b.owner).filter((a) => !kind || a.kind === kind);
  if (!anns.length) continue;
  if (b.owner !== lastOwner) {
    console.log(`\n══ ${b.owner}`);
    lastOwner = b.owner;
  }
  console.log(`\n  ${b.src}  «${b.text.slice(0, 72).replace(/\s+/g, " ")}…»`);
  for (const a of anns) {
    links += 1;
    // 40 characters either side, so the reader can judge the link from the sentence it sits in
    // rather than from the matched words alone — which is exactly what the bare "John" fault
    // needed and what a snapshot row cannot give.
    const before = b.text.slice(Math.max(0, a.start - 40), a.start).replace(/\s+/g, " ");
    const after = b.text.slice(a.end, a.end + 40).replace(/\s+/g, " ");
    console.log(`     ${a.kind}:${a.id}`);
    console.log(`       …${before}«${b.text.slice(a.start, a.end)}»${after}…`);
  }
}
console.log(`\n${links} links in ${wanted.length} blocks. Read every one.`);
