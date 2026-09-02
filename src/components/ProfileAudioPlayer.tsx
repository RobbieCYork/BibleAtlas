import { useEffect, useState } from "react";
import { profileAudioAvailable, profileAudioUrl, type ProfileAudioKind } from "../lib/profileAudio";
import Icon from "./Icon";

interface ProfileAudioPlayerProps {
  kind: ProfileAudioKind;
  id: string;
}

/** The "Listen to this profile" pill shown in a details panel when a pre-generated narration MP3
 * exists for the entry (see src/lib/profileAudio.ts for the file convention). Renders nothing at
 * all while availability is unknown or the file is missing — the panels don't need a loading
 * state for a feature most entries won't have yet. */
export default function ProfileAudioPlayer({ kind, id }: ProfileAudioPlayerProps) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Reset per entry — cross-linking from one person/place to another reuses this mounted
    // component, and the previous entry's availability/open state mustn't leak across.
    setAvailable(false);
    setOpen(false);
    let cancelled = false;
    profileAudioAvailable(kind, id).then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (!available) return null;

  return (
    <div className="profile-audio no-print">
      <button
        type="button"
        className={`profile-audio-pill${open ? " profile-audio-pill-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-pressed={open}
      >
        <Icon name="headphones" inline /> Listen to this profile
      </button>
      {open && <audio className="profile-audio-player" controls autoPlay src={profileAudioUrl(kind, id)} />}
    </div>
  );
}
