// Ad-hoc: how does a candidate sentence link on the PANEL path (what an article renders)?
//   node scripts/name-linker/probe.mjs "<owner-id>" "some sentence"
import { loadLinker } from "./loadLinker.mjs";
const { computeLinkAnnotations } = await loadLinker();
const owner = process.argv[2];
for (const text of process.argv.slice(3)) {
  // `excludeId` is the SECOND POSITIONAL argument, not an options object — see the signature in
  // src/lib/verseAnnotations.ts, and every other caller in this directory. This line passed
  // `{ excludeId }`, so the self-link exclusion never fired here and probe reported a link on the
  // record's own name that no reader ever sees. It could only ever ADD a row, never hide one, so
  // nothing found with this tool was wrong — but the noise is real and the next tool written by
  // copying this one inherits it, which is how it reached the versions batch's first enumerator.
  const anns = computeLinkAnnotations(text, owner || undefined);
  console.log("TEXT:", text);
  if (!anns.length) console.log("   (no links)");
  for (const a of anns) console.log(`   «${text.slice(a.start, a.end)}» -> ${a.kind}:${a.id}`);
  console.log();
}
