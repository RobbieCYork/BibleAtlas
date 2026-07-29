/** Audio-atlas profile narration — pre-generated MP3s dropped into public/audio/profiles/
 * (see scripts/generate-profile-audio.mjs and README-AUDIO.md). The convention is
 * /audio/profiles/{kind}-{id}.mp3, e.g. /audio/profiles/location-jerusalem.mp3. Files are
 * optional per entry: the player UI only appears for entries whose file actually exists. */

export type ProfileAudioKind = "location" | "poi" | "person";

export function profileAudioUrl(kind: ProfileAudioKind, id: string): string {
  return `${import.meta.env.BASE_URL}audio/profiles/${kind}-${id}.mp3`;
}

/** One availability answer per URL for the whole session — a missing file stays missing and an
 * existing one stays existing; no point re-HEADing on every panel open. Stored as promises so
 * concurrent checks for the same entry share a single request. */
const availabilityCache = new Map<string, Promise<boolean>>();

/** Whether narration exists for this entry, via a HEAD request. The content-type check matters
 * in dev: Vite serves index.html (200, text/html) for any unknown public/ path, so a bare
 * res.ok would report every entry as narrated. */
export function profileAudioAvailable(kind: ProfileAudioKind, id: string): Promise<boolean> {
  const url = profileAudioUrl(kind, id);
  let cached = availabilityCache.get(url);
  if (!cached) {
    cached = fetch(url, { method: "HEAD" })
      .then((res) => res.ok && (res.headers.get("content-type") ?? "").toLowerCase().startsWith("audio/"))
      .catch(() => {
        // Transient network failure — forget it so a later panel open can try again.
        availabilityCache.delete(url);
        return false;
      });
    availabilityCache.set(url, cached);
  }
  return cached;
}
