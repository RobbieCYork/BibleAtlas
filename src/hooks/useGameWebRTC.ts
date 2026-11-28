import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { registerReloadGuard } from "../lib/updateCheck";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const KINDS = ["audio", "video"] as const;
type Kind = (typeof KINDS)[number];

/** What a player picks on the lobby card, before any browser permission prompt. */
export type MediaChoice = "both" | "mic" | "none";

type SignalPayload = { from: string; to: string; fromInstance?: string; toInstance?: string } & (
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
);

export interface PeerMedia {
  mic?: boolean;
  camera?: boolean;
}

/** What each player publishes about themselves: once through presence on joining the channel, and by
 * a `media-state` broadcast on every change after that. */
interface PresenceMeta extends PeerMedia {
  userId: string;
  /** One per visit to the room, time-prefixed so a later visit sorts after an earlier one. */
  instance?: string;
}

interface Peer {
  pc: RTCPeerConnection;
  instance?: string;
  /** ICE candidates that arrived before the remote description they belong to. */
  pendingIce: RTCIceCandidateInit[];
  /** Signals for one peer are handled strictly one after another. */
  chain: Promise<void>;
  seenInPresence: boolean;
}

export interface GameMedia {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  remoteMedia: Record<string, PeerMedia>;
  micOn: boolean;
  cameraOn: boolean;
  micPending: boolean;
  cameraPending: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  /** False until the player has picked how to join (or touched a toggle) in this room. */
  hasChosen: boolean;
  choose: (choice: MediaChoice) => void;
  /** Short plain explanation when the camera or mic couldn't be turned on. */
  notice: string | null;
}

const DEVICE_NAME: Record<Kind, string> = { audio: "mic", video: "camera" };

function errorName(err: unknown): string {
  return (err as { name?: string } | null)?.name ?? "";
}

const isRefusal = (name: string) => name === "NotAllowedError" || name === "SecurityError";

function describeFailure(failures: Partial<Record<Kind, unknown>>): string | null {
  // Camera first, the way people say it.
  const failed = (["video", "audio"] as const).filter((k) => k in failures);
  if (failed.length === 0) return null;
  const names = failed.map((k) => errorName(failures[k]));
  const devices = failed.map((k) => DEVICE_NAME[k]);
  const either = devices.join(" or ");
  if (names.some(isRefusal)) {
    const off = `Your ${devices.join(" and ")} ${devices.length === 1 ? "is" : "are"} off: permission wasn't given.`;
    return `${off} You can still play. To try again, tap the ${either} button, or allow access in your settings.`;
  }
  if (names.every((n) => n === "NotFoundError" || n === "OverconstrainedError")) {
    return `No ${either} was found on this device. You can still play.`;
  }
  if (names.some((n) => n === "NotReadableError" || n === "AbortError")) {
    return `Your ${either} is busy, maybe in use by another app. You can still play and try again later.`;
  }
  return `Couldn't turn on your ${either}. You can still play and try again later.`;
}

const UNSUPPORTED = "This browser can't use a camera or mic here. You can still play.";
/** The message sits above the question during play, so it doesn't stay for the whole game. */
const NOTICE_MS = 15_000;

/** Mesh WebRTC video/audio between everyone in a game room — no video-specific backend, just
 * Supabase Realtime's `broadcast` (SDP/ICE signaling and camera/mic on-off, ephemeral) and `presence`
 * (who's actually connected right now) on one channel per room. STUN-only
 * (Google's public server); there's no TURN server configured, so two players both behind
 * restrictive/symmetric NATs may fail to connect directly to each other even though most
 * home-network pairs work fine. Mesh tops out well before the room's own 8-player cap — fine for the
 * small-group case this is built for.
 *
 * Camera and mic are optional. Nothing here asks the browser for either until the player taps a
 * choice or a toggle. Every connection is negotiated once, with an audio and a video slot in both
 * directions whether or not anything is being sent: someone with no media still receives everyone
 * else, and turning a device on or off just swaps the track in its slot (no renegotiation). "Off"
 * stops the track, so the camera light goes out.
 *
 * Tie-break for who initiates: whichever of the two peer ids sorts first (plain string comparison)
 * sends the offer, so both sides never simultaneously try to be the offerer ("glare"). */
export function useGameWebRTC(roomId: string | null, userId: string): GameMedia {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteMedia, setRemoteMedia] = useState<Record<string, PeerMedia>>({});
  const [on, setOn] = useState({ audio: false, video: false });
  const [pending, setPending] = useState({ audio: false, video: false });
  const [hasChosen, setHasChosen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const tracksRef = useRef<Record<Kind, MediaStreamTrack | null>>({ audio: null, video: null });
  const pendingRef = useRef<Record<Kind, boolean>>({ audio: false, video: false });
  /** Bumped whenever a device is switched off or the room is left, so a permission answer that
   * arrives afterwards is thrown away (and its track stopped) instead of turning the device on. */
  const generationRef = useRef<Record<Kind, number>>({ audio: 0, video: 0 });
  const peersRef = useRef<Map<string, Peer>>(new Map());
  /** Tells the others which of this player's devices are on. Set by the signaling effect. */
  const announceRef = useRef<() => void>(() => {});

  /** Pushes what's in tracksRef out to React, to every connection, and to the other players. */
  const publishLocal = useCallback(() => {
    const { audio, video } = tracksRef.current;
    const tracks = [audio, video].filter((t): t is MediaStreamTrack => t !== null);
    setLocalStream(tracks.length ? new MediaStream(tracks) : null);
    setOn({ audio: audio !== null, video: video !== null });
    peersRef.current.forEach(({ pc }) => {
      if (pc.signalingState === "closed") return;
      for (const t of pc.getTransceivers()) {
        t.sender.replaceTrack(tracksRef.current[t.receiver.track.kind as Kind]).catch(() => {});
      }
    });
    announceRef.current();
  }, []);

  const setPendingKind = (kind: Kind, value: boolean) => {
    pendingRef.current[kind] = value;
    setPending((p) => (p[kind] === value ? p : { ...p, [kind]: value }));
  };

  /** Asks the browser for the given devices. Only ever called from a tap, and getUserMedia is
   * invoked before the first await so Safari still counts it as the tap's own request. */
  const acquire = async (kinds: Kind[]) => {
    const wanted = kinds.filter((k) => !tracksRef.current[k] && !pendingRef.current[k]);
    if (wanted.length === 0) return;
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice(UNSUPPORTED);
      return;
    }
    const token = { ...generationRef.current };
    const current = (k: Kind) => generationRef.current[k] === token[k];
    wanted.forEach((k) => setPendingKind(k, true));

    const request = async (ks: Kind[]) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: ks.includes("audio"), video: ks.includes("video") });
      for (const track of stream.getTracks()) {
        const kind = track.kind as Kind;
        if (!current(kind) || tracksRef.current[kind]) {
          track.stop();
          continue;
        }
        tracksRef.current[kind] = track;
        // Fires when the device goes away underneath us (unplugged, revoked, taken by the system),
        // never for our own stop().
        track.onended = () => {
          if (tracksRef.current[kind] !== track) return;
          tracksRef.current[kind] = null;
          setNotice(`Your ${DEVICE_NAME[kind]} stopped. Tap its button to turn it back on.`);
          publishLocal();
        };
      }
      publishLocal();
    };

    const failures: Partial<Record<Kind, unknown>> = {};
    try {
      await request(wanted);
    } catch (err) {
      if (wanted.length > 1 && !isRefusal(errorName(err))) {
        // One device missing or busy fails the whole request — take whichever one does work.
        // Never after a refusal: that would put a second prompt in front of someone who said no.
        for (const kind of wanted) {
          if (!current(kind)) continue;
          try {
            await request([kind]);
          } catch (e) {
            failures[kind] = e;
          }
        }
      } else {
        wanted.forEach((k) => (failures[k] = err));
      }
    }
    for (const kind of wanted) {
      if (current(kind)) setPendingKind(kind, false);
      else delete failures[kind];
    }
    const message = describeFailure(failures);
    if (message) setNotice(message);
  };

  const release = (kinds: Kind[]) => {
    for (const kind of kinds) {
      generationRef.current[kind] += 1;
      setPendingKind(kind, false);
      tracksRef.current[kind]?.stop();
      tracksRef.current[kind] = null;
    }
    publishLocal();
  };

  const toggle = (kind: Kind) => {
    if (!roomId) return;
    setHasChosen(true);
    // A tap while the browser is still asking cancels the wait, so a prompt that was dismissed
    // without an answer can never leave the button stuck.
    if (tracksRef.current[kind] || pendingRef.current[kind]) {
      setNotice(null);
      release([kind]);
    } else void acquire([kind]);
  };

  const choose = (choice: MediaChoice) => {
    if (!roomId) return;
    setHasChosen(true);
    if (choice === "none") {
      setNotice(null);
      release([...KINDS]);
    } else void acquire(choice === "mic" ? ["audio"] : [...KINDS]);
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Everything about this player's own media belongs to one room: leaving it (or this screen) stops
  // the devices and forgets the choice. The choice survives lobby -> active -> finished.
  useEffect(() => {
    if (!roomId) return;
    // An automatic app update must not reload someone out of a lobby or off the results screen
    // while they're in a room with other people.
    const unguard = registerReloadGuard(() => true);
    return () => {
      unguard();
      for (const kind of KINDS) {
        generationRef.current[kind] += 1;
        pendingRef.current[kind] = false;
        tracksRef.current[kind]?.stop();
        tracksRef.current[kind] = null;
      }
      setLocalStream(null);
      setOn({ audio: false, video: false });
      setPending({ audio: false, video: false });
      setHasChosen(false);
      setNotice(null);
    };
  }, [roomId]);

  // Signaling. Deliberately independent of local media: one channel per room visit.
  useEffect(() => {
    if (!roomId || typeof RTCPeerConnection === "undefined") return;

    const topic = `game-room-rtc-${roomId}`;
    const instance = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const peers = peersRef.current;
    /** Latest `media-state` heard from each player. */
    const heard = new Map<string, PresenceMeta>();
    /** Visits presence has reported leaving. */
    const gone = new Set<string>();
    /** Visits already told which of our devices are on. */
    const greeted = new Set<string>();
    /** Groups our two outgoing tracks into one stream on the other side. */
    const outbound = new MediaStream();
    let channel: RealtimeChannel | null = null;
    let subscribed = false;
    let cancelled = false;

    const dropRemoteStream = (peerId: string) =>
      setRemoteStreams((prev) => {
        if (!(peerId in prev)) return prev;
        const next = { ...prev };
        delete next[peerId];
        return next;
      });

    const closePeer = (peerId: string) => {
      peers.get(peerId)?.pc.close();
      peers.delete(peerId);
      dropRemoteStream(peerId);
    };

    const send = (signal: SignalPayload) => {
      void channel?.send({ type: "broadcast", event: "webrtc-signal", payload: signal });
    };

    const createPeer = (peerId: string, peerInstance: string | undefined): Peer => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const peer: Peer = { pc, instance: peerInstance, pendingIce: [], chain: Promise.resolve(), seenInPresence: false };
      pc.onicecandidate = (event) => {
        if (!event.candidate || peers.get(peerId) !== peer) return;
        send({ type: "ice", from: userId, to: peerId, fromInstance: instance, toInstance: peer.instance, candidate: event.candidate.toJSON() });
      };
      pc.ontrack = () => {
        if (peers.get(peerId) !== peer) return;
        setRemoteStreams((prev) => ({ ...prev, [peerId]: new MediaStream(pc.getReceivers().map((r) => r.track)) }));
      };
      pc.onconnectionstatechange = () => {
        if (peers.get(peerId) !== peer) return;
        // "disconnected" is left alone: it often recovers by itself, and no new track event would
        // fire to bring the tile back.
        if (pc.connectionState === "failed") dropRemoteStream(peerId);
      };
      peers.set(peerId, peer);
      return peer;
    };

    const enqueue = (peer: Peer, step: () => Promise<void>) => {
      peer.chain = peer.chain.then(step).catch(() => {});
    };

    const flushIce = async (peer: Peer) => {
      for (const candidate of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(candidate).catch(() => {});
    };

    const offerTo = (peerId: string, peerInstance: string | undefined): Peer => {
      const peer = createPeer(peerId, peerInstance);
      for (const kind of KINDS) {
        const transceiver = peer.pc.addTransceiver(kind, { direction: "sendrecv", streams: [outbound] });
        transceiver.sender.replaceTrack(tracksRef.current[kind]).catch(() => {});
      }
      enqueue(peer, async () => {
        const offer = await peer.pc.createOffer();
        await peer.pc.setLocalDescription(offer);
        send({ type: "offer", from: userId, to: peerId, fromInstance: instance, toInstance: peer.instance, sdp: offer });
      });
      return peer;
    };

    const onSignal = (signal: SignalPayload) => {
      if (signal.to !== userId) return;
      if (signal.toInstance && signal.toInstance !== instance) return; // meant for an earlier visit
      const from = signal.from;
      let peer = peers.get(from);
      const otherVisit = !!(peer?.instance && signal.fromInstance && peer.instance !== signal.fromInstance);
      if (signal.type === "offer") {
        // A connection is only ever offered once, so a second offer means they started over.
        if (peer && (peer.pc.remoteDescription || otherVisit)) {
          closePeer(from);
          peer = undefined;
        }
        peer ??= createPeer(from, signal.fromInstance);
      } else if (signal.type === "ice") {
        if (otherVisit) return;
        peer ??= createPeer(from, signal.fromInstance);
      } else if (!peer || otherVisit) return;

      const target = peer;
      enqueue(target, async () => {
        const { pc } = target;
        if (signal.type === "offer") {
          await pc.setRemoteDescription(signal.sdp);
          // Answer in both directions even with nothing to send yet.
          for (const t of pc.getTransceivers()) {
            t.direction = "sendrecv";
            t.sender.setStreams?.(outbound);
            await t.sender.replaceTrack(tracksRef.current[t.receiver.track.kind as Kind]);
          }
          await flushIce(target);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: "answer", from: userId, to: from, fromInstance: instance, toInstance: target.instance, sdp: answer });
        } else if (signal.type === "answer") {
          if (pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(signal.sdp);
          await flushIce(target);
        } else if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        } else {
          target.pendingIce.push(signal.candidate);
        }
      });
    };

    const myState = (): PresenceMeta => ({
      userId,
      instance,
      mic: tracksRef.current.audio !== null,
      camera: tracksRef.current.video !== null,
    });

    const announce = () => {
      if (channel && subscribed) void channel.send({ type: "broadcast", event: "media-state", payload: myState() });
    };

    const onMediaState = (state: PresenceMeta) => {
      const known = peers.get(state.userId)?.instance;
      if (known && state.instance && state.instance < known) return; // from an earlier visit
      heard.set(state.userId, state);
      setRemoteMedia((prev) => ({ ...prev, [state.userId]: { mic: state.mic, camera: state.camera } }));
    };

    // Presence is tracked once per visit, never updated: supabase-js (2.110) keeps the old entry
    // around after an update, which would leave a departed player looking present. The leave event is
    // watched as well, for the same reason (someone who rejoins before their old entry has expired).
    const onLeaveEvent = (left: PresenceMeta[], remaining: PresenceMeta[]) => {
      for (const { userId: peerId, instance: visit } of left) {
        if (!visit || remaining.some((m) => m.instance === visit)) continue;
        gone.add(visit);
        if (peers.get(peerId)?.instance === visit) closePeer(peerId);
      }
    };

    const onPresence = () => {
      if (!channel) return;
      const state = channel.presenceState<PresenceMeta>();
      const flags: Record<string, PeerMedia> = {};
      const present: string[] = [];

      for (const peerId of Object.keys(state)) {
        if (peerId === userId) continue;
        const latest = state[peerId]
          .filter((m) => !m.instance || !gone.has(m.instance))
          .sort((a, b) => (b.instance ?? "").localeCompare(a.instance ?? ""))[0];
        if (!latest) continue;
        present.push(peerId);
        // What they last said, unless that was an earlier visit than the one now present.
        const said = heard.get(peerId);
        const media = said && (said.instance ?? "") >= (latest.instance ?? "") ? said : latest;
        flags[peerId] = { mic: media.mic, camera: media.camera };
        // A newcomer only has what we published on joining, which may be out of date.
        if (latest.instance && !greeted.has(latest.instance)) {
          greeted.add(latest.instance);
          announce();
        }
        let peer = peers.get(peerId);
        if (peer?.instance && latest.instance && latest.instance > peer.instance) {
          closePeer(peerId); // they left and came back
          peer = undefined;
        }
        // New peers we don't have a connection to yet — the lexicographically-smaller id initiates.
        if (!peer && userId < peerId) peer = offerTo(peerId, latest.instance);
        if (peer) {
          peer.instance ??= latest.instance;
          // Only this same visit counts as seen, so an earlier visit's presence expiring can't
          // close the connection a new visit has just offered.
          if (peer.instance === latest.instance) peer.seenInPresence = true;
        }
      }

      // Peers no longer present — tear down their connection.
      for (const [peerId, peer] of [...peers]) {
        if (peer.seenInPresence && !present.includes(peerId)) closePeer(peerId);
      }
      setRemoteMedia(flags);
    };

    const start = () => {
      channel = supabase.channel(topic, { config: { presence: { key: userId } } });
      channel.on("broadcast", { event: "webrtc-signal" }, ({ payload }: { payload: SignalPayload }) => onSignal(payload));
      channel.on("broadcast", { event: "media-state" }, ({ payload }: { payload: PresenceMeta }) => onMediaState(payload));
      channel.on("presence", { event: "sync" }, onPresence);
      channel.on<PresenceMeta>("presence", { event: "join" }, ({ newPresences }) => {
        for (const m of newPresences) if (m.instance) gone.delete(m.instance);
      });
      channel.on<PresenceMeta>("presence", { event: "leave" }, ({ leftPresences, currentPresences }) =>
        onLeaveEvent(leftPresences, currentPresences)
      );
      announceRef.current = announce;
      channel.subscribe((status) => {
        subscribed = status === "SUBSCRIBED";
        if (!subscribed || !channel) return;
        void channel.track(myState());
        announce();
      });
    };

    // supabase.channel() hands back an existing channel of the same name, and one that is still on
    // its way out can't be reused — wait for it to go first (re-entering a room straight away).
    const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
    if (stale) {
      void supabase.removeChannel(stale).then(() => {
        if (!cancelled) start();
      });
    } else start();

    return () => {
      cancelled = true;
      announceRef.current = () => {};
      for (const peerId of [...peers.keys()]) closePeer(peerId);
      if (channel) void supabase.removeChannel(channel);
      channel = null;
      setRemoteStreams({});
      setRemoteMedia({});
    };
  }, [roomId, userId]);

  return {
    localStream,
    remoteStreams,
    remoteMedia,
    micOn: on.audio,
    cameraOn: on.video,
    micPending: pending.audio,
    cameraPending: pending.video,
    toggleMic: () => toggle("audio"),
    toggleCamera: () => toggle("video"),
    hasChosen,
    choose,
    notice,
  };
}
