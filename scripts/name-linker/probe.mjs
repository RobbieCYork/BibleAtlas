// Ad-hoc: how does a candidate sentence link on the PANEL path (what an article renders)?
//   node scripts/name-linker/probe.mjs "<owner-id>" "some sentence"
import { loadLinker } from "./loadLinker.mjs";
const { computeLinkAnnotations } = await loadLinker();
const owner = process.argv[2];
for (const text of process.argv.slice(3)) {
  const anns = computeLinkAnnotations(text, { excludeId: owner || undefined });
  console.log("TEXT:", text);
  if (!anns.length) console.log("   (no links)");
  for (const a of anns) console.log(`   «${text.slice(a.start, a.end)}» -> ${a.kind}:${a.id}`);
  console.log();
}
