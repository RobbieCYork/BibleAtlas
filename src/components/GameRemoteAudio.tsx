import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/** Starts one player's sound; reports whether the browser refused to until the listener taps. */
function tryPlay(el: HTMLAudioElement, report: (blocked: boolean) => void) {
  el.play().then(
    () => report(false),
    (err: unknown) => {
      if ((err as { name?: string }).name === "NotAllowedError") report(true);
    }
  );
}

function PeerAudio({
  peerId,
  stream,
  register,
  report,
}: {
  peerId: string;
  stream: MediaStream;
  register: (peerId: string, el: HTMLAudioElement | null) => void;
  report: (peerId: string, blocked: boolean) => void;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    register(peerId, el);
    const onBlocked = (blocked: boolean) => report(peerId, blocked);
    el.srcObject = new MediaStream(stream.getAudioTracks());
    // iOS can pause playback when the audio route changes (e.g. this player's own mic starting or
    // stopping), so ask again whenever it does.
    el.onpause = () => {
      if (el.isConnected && el.srcObject) tryPlay(el, onBlocked);
    };
    tryPlay(el, onBlocked);
    return () => {
      el.onpause = null;
      el.srcObject = null;
      register(peerId, null);
      report(peerId, false);
    };
  }, [peerId, stream, register, report]);
  return <audio ref={ref} autoPlay data-peer={peerId} />;
}

/** Everyone else's sound, kept apart from the video tiles: it plays whether or not their camera is
 * on, and it stays mounted from lobby to results, so a player isn't asked to unlock it again on
 * every screen. Safari (iPhone and home-screen app) won't start sound on its own for someone who
 * isn't using their own mic, so when that happens we show a button; any tap in the game also counts. */
export default function GameRemoteAudio({ streams }: { streams: Record<string, MediaStream> }) {
  const elements = useRef(new Map<string, HTMLAudioElement>());
  const [blocked, setBlocked] = useState<string[]>([]);

  const register = useCallback((peerId: string, el: HTMLAudioElement | null) => {
    if (el) elements.current.set(peerId, el);
    else elements.current.delete(peerId);
  }, []);
  const report = useCallback((peerId: string, isBlocked: boolean) => {
    setBlocked((prev) => {
      if (prev.includes(peerId) === isBlocked) return prev;
      return isBlocked ? [...prev, peerId] : prev.filter((id) => id !== peerId);
    });
  }, []);
  /** Must run inside a tap, which is why play() is called directly and not from an effect. */
  const unlock = useCallback(() => {
    elements.current.forEach((el, peerId) => tryPlay(el, (b) => report(peerId, b)));
  }, [report]);

  const anyBlocked = blocked.length > 0;
  useEffect(() => {
    if (!anyBlocked) return;
    document.addEventListener("click", unlock, true);
    document.addEventListener("touchend", unlock, true);
    return () => {
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("touchend", unlock, true);
    };
  }, [anyBlocked, unlock]);

  return (
    <>
      {Object.entries(streams).map(([peerId, stream]) => (
        <PeerAudio key={peerId} peerId={peerId} stream={stream} register={register} report={report} />
      ))}
      {anyBlocked && (
        <button type="button" className="games-primary-button game-audio-unlock" onClick={unlock}>
          <Icon name="volume" inline /> Tap to hear everyone
        </button>
      )}
    </>
  );
}
