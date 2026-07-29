#!/usr/bin/env node
/**
 * Generates the audio-atlas pronunciation clips: one short MP3 per location/POI/person that has
 * a `pronunciation` field, written to public/audio/pronunciation/{kind}-{id}.mp3 (the exact
 * convention src/lib/pronunciationAudio.ts serves). Unlike generate-profile-audio.mjs (which
 * narrates the whole entry), this only synthesizes the pronunciation text itself — a few words
 * per entry — for the small 🔊 button next to "Pronounced: ..." in the detail panels.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-pronunciation-audio.mjs           # dry run: cost estimate only
 *   OPENAI_API_KEY=sk-... node scripts/generate-pronunciation-audio.mjs --yes     # actually generate
 *   Options: --model=gpt-4o-mini-tts|tts-1|tts-1-hd   (default gpt-4o-mini-tts)
 *            --voice=alloy|ash|echo|fable|onyx|nova|shimmer|...  (default onyx)
 *            --limit=N   only process the first N missing entries (good for a test run)
 *
 * Data access approach: same as generate-profile-audio.mjs — imports the .ts data files
 * directly using Node's built-in TypeScript type-stripping (Node >= 23.6; on 22.6-23.5 run with
 * `node --experimental-strip-types`). No npm dependencies. Existing MP3s are skipped, so
 * re-running only fills gaps (delete a file to regenerate it). Shares the OpenAI-calling/pricing
 * logic with generate-profile-audio.mjs via scripts/lib/ttsCommon.mjs.
 */

import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { requireTypeStrippingNode, parseArgs, PRICE_PER_MILLION_CHARS, synthesize } from "./lib/ttsCommon.mjs";

requireTypeStrippingNode();

const { locations } = await import(new URL("../src/data/locations.ts", import.meta.url));
const { pois } = await import(new URL("../src/data/pois.ts", import.meta.url));
const { people } = await import(new URL("../src/data/people.ts", import.meta.url));

const args = parseArgs(process.argv.slice(2));

const MODEL = typeof args.model === "string" ? args.model : "gpt-4o-mini-tts";
const VOICE = typeof args.voice === "string" ? args.voice : "onyx";
const LIMIT = typeof args.limit === "string" ? parseInt(args.limit, 10) : Infinity;
const price = PRICE_PER_MILLION_CHARS[MODEL] ?? 15;

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "audio", "pronunciation");
mkdirSync(OUT_DIR, { recursive: true });

// --- Plan: every entry with a pronunciation field, not yet on disk ---
const jobs = [];
for (const [kind, entries] of [
  ["location", locations],
  ["poi", pois],
  ["person", people],
]) {
  for (const entry of entries) {
    if (!entry.pronunciation) continue;
    const file = path.join(OUT_DIR, `${kind}-${entry.id}.mp3`);
    if (existsSync(file)) continue;
    // Speak the name plus its pronunciation, e.g. "Nebuchadnezzar. Pronounced: neb-yoo-kad-NEZ-er."
    // — the bare phonetic spelling alone reads oddly to TTS; naming the word first anchors it.
    const text = `${entry.name}. Pronounced: ${entry.pronunciation}.`;
    jobs.push({ kind, id: entry.id, file, text });
  }
}
const totalWithPronunciation = jobs.length;
const limited = jobs.slice(0, LIMIT);
const totalChars = limited.reduce((sum, j) => sum + j.text.length, 0);
const estimate = (totalChars / 1e6) * price;

console.log(`Model ${MODEL}, voice ${VOICE}`);
console.log(`${limited.length} pronunciation clip(s) to generate (${jobs.length - limited.length} more beyond --limit, existing files skipped)`);
console.log(`Total entries with a pronunciation field: ${totalWithPronunciation}`);
console.log(`Total input: ${totalChars.toLocaleString()} chars`);
console.log(`Estimated cost: ~$${estimate.toFixed(2)}  (${totalChars.toLocaleString()} / 1M × $${price})`);

if (!args.yes) {
  console.log("\nDry run only. Re-run with --yes to spend this and generate the files.");
  process.exit(0);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set.");
  process.exit(1);
}

let done = 0;
for (const job of limited) {
  process.stdout.write(`[${++done}/${limited.length}] ${job.kind}-${job.id} (${job.text.length} chars)… `);
  try {
    const mp3 = await synthesize(job.text, { model: MODEL, voice: VOICE });
    writeFileSync(job.file, mp3);
    console.log(`ok (${(mp3.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
  }
}
console.log("Done. Files are in public/audio/pronunciation/ — the app picks them up automatically.");
