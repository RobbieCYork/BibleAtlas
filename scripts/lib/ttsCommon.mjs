/**
 * Shared OpenAI-TTS plumbing for the audio-atlas generator scripts (generate-profile-audio.mjs
 * and generate-pronunciation-audio.mjs) — arg parsing, per-model pricing, text chunking, and the
 * actual fetch call to the OpenAI speech endpoint. Kept here so the two scripts don't duplicate
 * the parts that must behave identically (cost estimate math, --yes gating, chunk splitting).
 */

/** Requires Node's built-in TypeScript type-stripping (on by default since 23.6) so the callers
 * can `import()` the .ts data files directly. Exits the process if the running Node is too old. */
export function requireTypeStrippingNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 23 || (major === 23 && minor < 6)) {
    console.error(`Node ${process.versions.node} can't import the .ts data files directly.`);
    console.error("Use Node >= 23.6, or re-run with: node --experimental-strip-types <script>");
    process.exit(1);
  }
}

export function parseArgs(argv) {
  return Object.fromEntries(
    argv.map((a) => {
      const m = a.match(/^--([^=]+)(?:=(.*))?$/);
      return m ? [m[1], m[2] ?? true] : [a, true];
    })
  );
}

/** Rough $/1M input characters. tts-1(-hd) is priced per char; gpt-4o-mini-tts is priced per
 * token+audio-minute, which works out to roughly this per char. */
export const PRICE_PER_MILLION_CHARS = { "gpt-4o-mini-tts": 12, "tts-1": 15, "tts-1-hd": 30 };

/** Splits text into chunks under the API's 4096-char input limit, preferring paragraph then
 * sentence breaks. */
export function chunkText(text, max = 4000) {
  if (text.length <= max) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > max) {
    const slice = rest.slice(0, max);
    let cut = slice.lastIndexOf("\n\n");
    if (cut < max * 0.5) cut = slice.lastIndexOf(". ") + 1;
    if (cut < max * 0.5) cut = max;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** Calls the OpenAI TTS endpoint for `text` (chunked as needed) and returns the concatenated MP3
 * bytes (MP3 frame streams concatenate playably). */
export async function synthesize(text, { model, voice }) {
  const buffers = [];
  for (const chunk of chunkText(text)) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, voice, input: chunk, response_format: "mp3" }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(buffers);
}
