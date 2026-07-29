#!/usr/bin/env node
/**
 * Generates the audio-atlas profile narrations: one MP3 per location/POI/person, written to
 * public/audio/profiles/{kind}-{id}.mp3 (the exact convention src/lib/profileAudio.ts serves).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-profile-audio.mjs           # dry run: cost estimate only
 *   OPENAI_API_KEY=sk-... node scripts/generate-profile-audio.mjs --yes     # actually generate
 *   Options: --model=gpt-4o-mini-tts|tts-1|tts-1-hd   (default gpt-4o-mini-tts)
 *            --voice=alloy|ash|echo|fable|onyx|nova|shimmer|...  (default onyx)
 *            --limit=N   only process the first N missing entries (good for a test run)
 *
 * Data access approach (documented per spec): the profile text lives in TypeScript files
 * (src/data/locations.ts etc.). Rather than regex-scraping them, this script imports them
 * directly using Node's built-in TypeScript type-stripping — the data files contain only
 * `import type` and plain object literals, which strip cleanly. Requires Node >= 23.6 (type
 * stripping on by default; the project already runs Node 24). On 22.6–23.5 run with
 * `node --experimental-strip-types`.
 *
 * No npm dependencies: the OpenAI TTS endpoint is called with global fetch. Existing MP3s are
 * skipped, so re-running only fills gaps (delete a file to regenerate it). Texts longer than
 * the API's 4096-char input limit are split on paragraph/sentence boundaries and the returned
 * MP3s are concatenated (MP3 frame streams concatenate playably).
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

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "audio", "profiles");
mkdirSync(OUT_DIR, { recursive: true });

/** Composes the narration text for one entry — name/summary first, then the substance. */
function narrationText(kind, entry) {
  const parts = [];
  if (kind === "location") {
    parts.push(`${entry.name}.`);
    if (entry.modernName) parts.push(`Known today as ${entry.modernName}.`);
    const h = entry.history ?? {};
    if (h.founded) parts.push(`Founded: ${h.founded}.`);
    if (h.population) parts.push(`Population: ${h.population}.`);
    if (h.industry) parts.push(`Industry: ${h.industry}.`);
    for (const fact of h.notableFacts ?? []) parts.push(`${fact}.`);
    if (entry.archaeology?.note) parts.push(`Archaeology: ${entry.archaeology.note}`);
  } else if (kind === "poi") {
    parts.push(`${entry.name}. ${entry.tag}.`);
    parts.push(entry.description);
    if (entry.archaeology?.note) parts.push(`Archaeology: ${entry.archaeology.note}`);
  } else {
    parts.push(`${entry.name}. ${entry.role}.`);
    parts.push(entry.summary);
    parts.push(...(entry.lifeStory ?? []));
  }
  return parts.join("\n\n").replace(/\s+\n/g, "\n").trim();
}

// --- Plan: everything not yet on disk ---
const jobs = [];
for (const [kind, entries] of [
  ["location", locations],
  ["poi", pois],
  ["person", people],
]) {
  for (const entry of entries) {
    const file = path.join(OUT_DIR, `${kind}-${entry.id}.mp3`);
    if (existsSync(file)) continue;
    const text = narrationText(kind, entry);
    jobs.push({ kind, id: entry.id, file, text });
  }
}
const limited = jobs.slice(0, LIMIT);
const totalChars = limited.reduce((sum, j) => sum + j.text.length, 0);
const estimate = (totalChars / 1e6) * price;

console.log(`Model ${MODEL}, voice ${VOICE}`);
console.log(`${limited.length} narration(s) to generate (${jobs.length - limited.length} more beyond --limit, existing files skipped)`);
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
console.log("Done. Files are in public/audio/profiles/ — the app picks them up automatically.");
