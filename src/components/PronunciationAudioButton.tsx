import { useEffect, useRef, useState } from "react";
import { pronunciationAudioAvailable, pronunciationAudioUrl, type PronunciationAudioKind } from "../lib/pronunciationAudio";

interface PronunciationAudioButtonProps {
  kind: PronunciationAudioKind;
  id: string;
}

/** Compact inline 🔊 icon button shown right next to a "Pronounced: ..." label when a
 * pre-generated pronunciation MP3 exists for the entry (see src/lib/pronunciationAudio.ts for
 * the file convention). Unlike ProfileAudioPlayer's expandable pill (built for long narration),
 * this is a single small button that just plays the clip — renders nothing at all while
 * availability is unknown or the file is missing. */
export default function PronunciationAudioButton({ kind, id }: PronunciationAudioButtonProps) {
  const [available, setAvailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset per entry — cross-linking from one person/place to another reuses this mounted
    // component, and the previous entry's availability mustn't leak across.
    setAvailable(false);
    let cancelled = false;
    pronunciationAudioAvailable(kind, id).then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (!available) return null;

  return (
    <button
      type="button"
      className="pronunciation-audio-button no-print"
      onClick={() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        void audio.play();
      }}
      aria-label="Play pronunciation"
      title="Play pronunciation"
    >
      🔊
      <audio ref={audioRef} src={pronunciationAudioUrl(kind, id)} preload="none" />
    </button>
  );
}
