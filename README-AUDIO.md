# Bible Atlas — Audio

Two audio features, one free and live today, one waiting on generated files.

## 1. Chapter narration (free, live)

The Bible reader's **🔊 Listen** button plays a free, public-domain **human narration** of the
World English Bible — Winfred W. Henson's recording, distributed by eBible.org. It is
WEB-only, so the button appears only while the WEB translation is selected.

- **Primary source** (templatable, CORS-open, verified for all 1,189 chapters):
  `https://archive.org/download/legacy-web-audio/out/web-audio/{BB}/{CCC}.mp3`
  where `{BB}` is the 2-digit Protestant canon book number (01 Genesis … 66 Revelation) and
  `{CCC}` the 3-digit chapter.
- **Fallback**: the original eBible.org files at `https://ebible.org/eng-web/audio/`. Their
  filenames are hand-named and inconsistent (spelled-out chapter words, a double-space file in
  2 Thessalonians, a duplicated sequence number in Isaiah, "Acts-Chapter Thirteen 1.mp3"), so
  the app ships a pre-scraped map in `public/web-audio-manifest.json` ("Book|chapter" → URL,
  1,189 entries) that the player loads lazily only if archive.org errors.
  Regenerate it with `node scripts/generate-web-audio-manifest.mjs > public/web-audio-manifest.json`
  — the script validates count and chapter order per book and fails loudly on any quirk it
  can't prove correct.
- **Credit** (also shown in the player bar and the Listen button tooltip):
  *Audio: Winfred W. Henson's recording of the World English Bible, via eBible.org.*

## 2. Audio atlas — profile narrations (player live, files generated on demand)

Location/POI/person panels show a **🎧 Listen to this profile** pill whenever a narration file
exists at `public/audio/profiles/{kind}-{id}.mp3` (kind = `location` | `poi` | `person`, e.g.
`location-jerusalem.mp3`). No file → no pill; nothing else to configure. Browser TTS is
deliberately not used anywhere — these are pre-generated, professional TTS files.

### Generating the files

```sh
# Dry run — prints the character count and cost estimate, generates nothing:
OPENAI_API_KEY=sk-... node scripts/generate-profile-audio.mjs

# Generate (skips files that already exist; --limit=3 for a small test batch first):
OPENAI_API_KEY=sk-... node scripts/generate-profile-audio.mjs --yes
# Options: --model=gpt-4o-mini-tts|tts-1|tts-1-hd   --voice=onyx|alloy|nova|...   --limit=N
```

The script imports the profile text straight from `src/data/*.ts` using Node's built-in
TypeScript type-stripping (Node ≥ 23.6; on 22.6–23.5 add `--experimental-strip-types`), so
there is nothing to install. It always prints the estimate and refuses to spend without
`--yes`.

**Expected one-time cost**: roughly **$10–40** for the full catalog depending on model
(estimate = characters / 1M × $12–30). Re-runs cost nothing for entries already on disk.

**ElevenLabs alternative**: for a more premium voice, subscribe to ElevenLabs for one cheap
month, batch-generate everything into `public/audio/profiles/` with the same filenames, then
cancel — the app only cares that the MP3s exist at the right paths.
