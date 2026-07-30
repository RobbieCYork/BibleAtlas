import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

type SignalPayload =
  | { type: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInit };

interface UseGameWebRTCResult {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  micOn: boolean;
  cameraOn: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  /** Set once getUserMedia is denied/unavailable — lets the UI show an explanation instead of an
   * empty tile that looks broken. */
  mediaError: string | null;
}

/** Mesh WebRTC video/audio between everyone in a game room — no video-specific backend, just
 * Supabase Realtime's `broadcast` (SDP/ICE signaling, ephemeral) and `presence` (who's actually
 * connected right now) on one channel per room. STUN-only (Google's public server); there's no TURN
 * server configured, so two players both behind restrictive/symmetric NATs may fail to connect
 * directly to each other even though most home-network pairs work fine. Mesh tops out well before
 * the room's own 8-player cap — fine for the small-group case this is built for.
 *
 * Tie-break for who initiates: whichever of the two peer ids sorts first (plain string comparison)
 * sends the offer, so both sides never simultaneously try to be the offerer ("glare"). */
export function useGameWebRTC(roomId: string | null, userId: string): UseGameWebRTCResult {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Acquire local media once per room — kept alive across lobby -> active -> finished so players
  // aren't re-prompted for camera/mic permission mid-game.
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      })
      .catch(() => {
        if (!cancelled) setMediaError("Camera/mic unavailable — you can still play without video.");
      });
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    };
  }, [roomId]);

  const getOrCreatePeerConnection = (peerId: string, channel: RealtimeChannel): RTCPeerConnection => {
    const existing = pcsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      channel.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: { type: "ice", from: userId, to: peerId, candidate: event.candidate.toJSON() } satisfies SignalPayload,
      });
    };
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] ?? new MediaStream([event.track]) }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed" || pc.connectionState === "disconnected") {
        setRemoteStreams((prev) => {
          if (!(peerId in prev)) return prev;
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    };

    pcsRef.current.set(peerId, pc);
    return pc;
  };

  const closePeerConnection = (peerId: string) => {
    pcsRef.current.get(peerId)?.close();
    pcsRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  };

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`game-room-rtc-${roomId}`, { config: { presence: { key: userId } } });
    channelRef.current = channel;

    channel.on("broadcast", { event: "webrtc-signal" }, async ({ payload }: { payload: SignalPayload }) => {
      if (payload.to !== userId) return;
      const pc = getOrCreatePeerConnection(payload.from, channel);
      if (payload.type === "offer") {
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: { type: "answer", from: userId, to: payload.from, sdp: answer } satisfies SignalPayload,
        });
      } else if (payload.type === "answer") {
        await pc.setRemoteDescription(payload.sdp);
      } else if (payload.type === "ice") {
        await pc.addIceCandidate(payload.candidate).catch(() => {});
      }
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ userId: string }>();
      const presentPeerIds = Object.keys(state).filter((id) => id !== userId);

      // New peers we don't have a connection to yet — the lexicographically-smaller id initiates.
      for (const peerId of presentPeerIds) {
        if (pcsRef.current.has(peerId)) continue;
        if (userId < peerId) {
          const pc = getOrCreatePeerConnection(peerId, channel);
          pc.createOffer()
            .then(async (offer) => {
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "webrtc-signal",
                payload: { type: "offer", from: userId, to: peerId, sdp: offer } satisfies SignalPayload,
              });
            })
            .catch(() => {});
        }
      }

      // Peers no longer present — tear down their connection.
      for (const peerId of pcsRef.current.keys()) {
        if (!presentPeerIds.includes(peerId)) closePeerConnection(peerId);
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") channel.track({ userId });
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      for (const peerId of [...pcsRef.current.keys()]) closePeerConnection(peerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, localStream]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraOn(next);
  };

  return { localStream, remoteStreams, micOn, cameraOn, toggleMic, toggleCamera, mediaError };
}
