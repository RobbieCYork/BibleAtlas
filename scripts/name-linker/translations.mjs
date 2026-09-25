#!/usr/bin/env node
// What the three translations do with one verse, and where they disagree across the whole Bible.
//
//   node scripts/name-linker/translations.mjs --ref "Matthew 2:1"     one verse, all three, ";" for several
//   node scripts/name-linker/translations.mjs --diverge               every divergence row, grouped by record
//   node scripts/name-linker/translations.mjs --diverge --id bethel   just that record
//   node scripts/name-linker/translations.mjs --diverge --kind person --missing ASV
//   node scripts/name-linker/translations.mjs --grep "Beth-el" --in ASV   every verse in one translation
//
// `--ref` is the tool to reach for the moment a divergence row looks wrong: it prints each
// translation's actual words beside its actual links, which is the only way to tell a defect (the
// name is sitting right there and does not link) from an honest difference (that translation
// prints a different word). run.mjs --ref answers the same question for WEB alone.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLinker, stripMarkup } from "./loadLinker.mjs";
import { loadAllTranslations, TRANSLATIONS } from "./corpus.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const DIM = "\x1b[2m", OFF = "\x1b[0m", YELLOW = "\x1b[33m", GREEN = "\x1b[32m", CYAN = "\x1b[36m";

const corpora = loadAllTranslations();
const { computeLinkAnnotations } = await loadLinker();
const byRef = {};
for (const t of TRANSLATIONS) {
  byRef[t] = new Map(corpora[t].map((v) => [`${v.book} ${v.chapter}:${v.verse}`, v]));
}

function showRef(ref) {
  console.log(`${CYAN}${ref}${OFF}`);
  for (const t of TRANSLATIONS) {
    const v = byRef[t].get(ref);
    if (!v) { console.log(`  ${t}  ${DIM}(not in this translation)${OFF}`); continue; }
    const text = stripMarkup(v.text);
    const anns = computeLinkAnnotations(text, undefined, v.book, v.chapter, v.verse);
    console.log(`  ${t}  ${text}`);
    if (!anns.length) { console.log(`        ${DIM}(no links)${OFF}`); continue; }
    for (const a of anns) {
      console.log(`        ${DIM}@${String(a.start).padStart(4)}${OFF} ${JSON.stringify(a.text).padEnd(28)} ` +
        `${a.kind.padEnd(9)} ${GREEN}${a.id ?? "-"}${OFF}`);
    }
  }
  console.log("");
}

if (has("--ref")) {
  for (const ref of val("--ref").split(";").map((s) => s.trim()).filter(Boolean)) showRef(ref);
  process.exit(0);
}

if (has("--grep")) {
  const re = new RegExp(val("--grep"), "i");
  const only = val("--in");
  let n = 0;
  for (const t of TRANSLATIONS) {
    if (only && t !== only.toUpperCase()) continue;
    for (const v of corpora[t]) {
      if (!re.test(stripMarkup(v.text))) continue;
      n++;
      console.log(`${CYAN}${t} ${v.book} ${v.chapter}:${v.verse}${OFF}  ${stripMarkup(v.text)}`);
    }
  }
  console.log(`${DIM}${n} matching verses${OFF}`);
  process.exit(0);
}

if (has("--diverge")) {
  const file = path.join(HERE, "snapshot/translation-divergence.tsv");
  const rows = fs.readFileSync(file, "utf8").trimEnd().split("\n").map((l) => l.split("\t"));
  const wantId = val("--id"), wantKind = val("--kind"), missing = val("--missing")?.toUpperCase();
  const groups = new Map();
  for (const [ref, kind, id, ...cells] of rows) {
    if (wantId && id !== wantId) continue;
    if (wantKind && kind !== wantKind) continue;
    const counts = {};
    for (const c of cells) counts[c.slice(0, 3)] = c.slice(4) === "n/a" ? -1 : Number(c.slice(4).split(":")[0]);
    const max = Math.max(...Object.values(counts));
    const shortOnes = TRANSLATIONS.filter((t) => counts[t] >= 0 && counts[t] < max);
    if (missing && !shortOnes.includes(missing)) continue;
    const k = `${kind}\t${id}\t${shortOnes.join(",") || "—"}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push([ref, cells.join("  ")]);
  }
  const total = [...groups.values()].reduce((a, b) => a + b.length, 0);
  console.log(`${total} divergence rows in ${groups.size} groups ${DIM}(record, and which translations link it fewer times)${OFF}\n`);
  for (const [k, refs] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const [kind, id, shortOnes] = k.split("\t");
    console.log(`${YELLOW}${String(refs.length).padStart(4)}${OFF}  ${kind}/${id}  ${DIM}fewer in:${OFF} ${shortOnes}`);
    for (const [ref, cells] of refs.slice(0, 3)) console.log(`        ${ref}  ${DIM}${cells}${OFF}`);
    if (refs.length > 3) console.log(`        ${DIM}… ${refs.length - 3} more${OFF}`);
  }
  process.exit(0);
}

console.log(fs.readFileSync(new URL(import.meta.url)).toString().split("\n").slice(1, 14).join("\n").replace(/^\/\/ ?/gm, ""));
