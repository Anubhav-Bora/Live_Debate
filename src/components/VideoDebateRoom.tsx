"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { Camera, CameraOff, Mic, MicOff, Radio, RefreshCw, Video, Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/context/SocketContext";
import { useAdvancedSpeechRecognition } from "@/hooks/useAdvancedSpeechRecognition";

type SignalData = Record<string, unknown>;
type PeerInstance = {
  on(event: string, callback: (...args: never[]) => void): void;
  signal(data: SignalData): void;
  destroy(): void;
};

interface VideoDebateRoomProps {
  debateId: string;
  userId: string;
  role: "pro" | "con";
  isDebateActive: boolean;
}

export default function VideoDebateRoom({ debateId, role, isDebateActive }: VideoDebateRoomProps) {
  const { socket, isConnected } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const transcriptSendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [startingMedia, setStartingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [proTranscript, setProTranscript] = useState("");
  const [conTranscript, setConTranscript] = useState("");

  const speechEnabled = Boolean(stream && isDebateActive && audioEnabled);
  const speech = useAdvancedSpeechRecognition(speechEnabled, {
    language: "en-US",
    continuous: true,
    interimResults: true,
  });
  const replaceSpeechTranscript = speech.replaceTranscript;

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    setVideoDevices(cameras);
    setSelectedDeviceId((current) => current || cameras[0]?.deviceId || "");
  }, []);

  useEffect(() => {
    refreshDevices().catch(() => undefined);
  }, [refreshDevices]);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setRemoteStream(null);
    peerRef.current?.destroy();
    peerRef.current = null;
    setPeerConnected(false);
  }, []);

  useEffect(() => stopMedia, [stopMedia]);

  const startMedia = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("Camera and microphone access require a modern browser and HTTPS (or localhost).");
      return;
    }
    setStartingMedia(true);
    setMediaError("");
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = nextStream;
      setStream(nextStream);
      setAudioEnabled(true);
      setVideoEnabled(true);
      await refreshDevices();
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMediaError(
        name === "NotAllowedError"
          ? "Camera or microphone permission was denied. Allow access in this site's browser settings."
          : name === "NotFoundError"
            ? "No camera or microphone was found. Connect a device and retry."
            : "The camera or microphone could not be started. Close other apps using it and retry.",
      );
    } finally {
      setStartingMedia(false);
    }
  };

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const createPeer = useCallback(() => {
    if (!socket || !isConnected || !streamRef.current) return null;
    if (peerRef.current) return peerRef.current;

    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
    if (process.env.NEXT_PUBLIC_TURN_URL) {
      iceServers.push({
        urls: process.env.NEXT_PUBLIC_TURN_URL,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
      });
    }

    const peer = new SimplePeer({
      initiator: role === "pro",
      trickle: true,
      stream: streamRef.current,
      config: { iceServers },
    }) as PeerInstance;
    peerRef.current = peer;
    peer.on("signal", ((signal: SignalData) => socket.emit("signal", { debateId, signal })) as never);
    peer.on("stream", ((incoming: MediaStream) => {
      setRemoteStream(incoming);
      setPeerConnected(true);
      setMediaError("");
    }) as never);
    peer.on("connect", (() => setPeerConnected(true)) as never);
    peer.on("close", (() => {
      setPeerConnected(false);
      if (peerRef.current === peer) peerRef.current = null;
    }) as never);
    peer.on("error", ((error: Error) => {
      console.warn("Peer connection failed:", error.message);
      setPeerConnected(false);
      setMediaError("Video connection was interrupted. It will reconnect when both participants are ready.");
      if (peerRef.current === peer) peerRef.current = null;
    }) as never);
    return peer;
  }, [debateId, isConnected, role, socket]);

  useEffect(() => {
    if (!socket || !isConnected || !stream) return;
    const onPeerReady = () => createPeer();
    const onSignal = ({ fromRole, signal }: { fromRole: string; signal: SignalData }) => {
      if (fromRole === role) return;
      try {
        createPeer()?.signal(signal);
      } catch (error) {
        console.warn("Could not apply peer signal:", error);
      }
    };
    socket.on("peer_ready", onPeerReady);
    socket.on("signal", onSignal);
    socket.emit("join_debate", { debateId }, (result: { ok?: boolean }) => {
      if (result?.ok) socket.emit("media_ready", { debateId });
    });
    return () => {
      socket.emit("media_not_ready", { debateId });
      socket.off("peer_ready", onPeerReady);
      socket.off("signal", onSignal);
      peerRef.current?.destroy();
      peerRef.current = null;
      setPeerConnected(false);
    };
  }, [createPeer, debateId, isConnected, role, socket, stream]);

  useEffect(() => {
    if (!socket) return;
    const onTranscript = ({ role: changedRole, transcript }: { role: "pro" | "con"; transcript: string }) => {
      if (changedRole === "pro") setProTranscript(transcript);
      if (changedRole === "con") setConTranscript(transcript);
    };
    const onState = ({ transcripts }: { transcripts?: { pro?: string; con?: string } }) => {
      const pro = transcripts?.pro || "";
      const con = transcripts?.con || "";
      setProTranscript(pro);
      setConTranscript(con);
      replaceSpeechTranscript(role === "pro" ? pro : con);
    };
    socket.on("transcript_update", onTranscript);
    socket.on("debate_state", onState);
    return () => {
      socket.off("transcript_update", onTranscript);
      socket.off("debate_state", onState);
    };
  }, [replaceSpeechTranscript, role, socket]);

  useEffect(() => {
    if (role === "pro") setProTranscript(speech.finalTranscript);
    else setConTranscript(speech.finalTranscript);
    if (!socket || !isConnected || !isDebateActive || !speech.finalTranscript) return;
    if (transcriptSendTimer.current) clearTimeout(transcriptSendTimer.current);
    transcriptSendTimer.current = setTimeout(() => {
      socket.emit("transcript_update", { debateId, transcript: speech.finalTranscript });
    }, 300);
    return () => {
      if (transcriptSendTimer.current) clearTimeout(transcriptSendTimer.current);
    };
  }, [debateId, isConnected, isDebateActive, role, socket, speech.finalTranscript]);

  const toggleTrack = (kind: "audio" | "video") => {
    const track = streamRef.current?.getTracks().find((candidate) => candidate.kind === kind);
    if (!track) return;
    track.enabled = !track.enabled;
    if (kind === "audio") {
      setAudioEnabled(track.enabled);
      socket?.emit(track.enabled ? "media_ready" : "media_not_ready", { debateId });
    } else {
      setVideoEnabled(track.enabled);
    }
  };

  const localFinal = role === "pro" ? proTranscript : conTranscript;
  const opponentFinal = role === "pro" ? conTranscript : proTranscript;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] bg-slate-950/40">
      <section className="p-3 sm:p-5">
        {mediaError && (
          <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {mediaError}
          </div>
        )}
        <div className="relative aspect-video min-h-64 overflow-hidden rounded-xl border border-[#303744] bg-[#080a0e]">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-lg border border-[#425a8f] bg-[#172035] p-4">
                <Video className="h-8 w-8 text-[#829ee3]" />
              </div>
              <p className="font-semibold text-white">{stream ? "Waiting for your opponent's camera" : "Camera is off"}</p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                {stream ? "The secure peer connection starts automatically when both sides are ready." : "Start your camera to enable video, audio, and live transcription."}
              </p>
              {!stream && (
                <button
                  type="button"
                  onClick={startMedia}
                  disabled={startingMedia}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#5d86ed] bg-[#4f73d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a7ee0] disabled:opacity-60"
                >
                  {startingMedia ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {startingMedia ? "Starting…" : "Start camera & microphone"}
                </button>
              )}
            </div>
          )}

          {stream && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-4 right-4 aspect-video w-28 rounded-xl border-2 border-white/30 bg-black object-cover shadow-xl sm:w-40"
            />
          )}
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/75 px-3 py-1.5 text-xs text-white">
            {peerConnected ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            {peerConnected ? "Peer connected" : isConnected ? "Waiting for peer" : "Reconnecting"}
          </div>
          {speechEnabled && (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/75 px-3 py-1.5 text-xs text-white">
              <Radio className={`h-3.5 w-3.5 ${speech.isListening ? "animate-pulse text-rose-400" : "text-amber-400"}`} />
              {speech.isListening ? "Transcribing" : "Speech paused"}
            </div>
          )}
        </div>

        {stream && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => toggleTrack("audio")} className="media-control">
              {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {audioEnabled ? "Mute" : "Unmute"}
            </button>
            <button type="button" onClick={() => toggleTrack("video")} className="media-control">
              {videoEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              {videoEnabled ? "Hide camera" : "Show camera"}
            </button>
            {videoDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                aria-label="Camera device"
              >
                {videoDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </section>

      <aside className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#829ee3]">Live transcript</p>
            <h3 className="mt-1 font-semibold text-white">Argument capture</h3>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${speech.isListening ? "animate-pulse bg-rose-400" : "bg-slate-600"}`} />
        </div>

        {!speech.isSupported && stream && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Live speech recognition is unavailable in this browser. Use current Chrome or Edge, or submit arguments in chat.
          </div>
        )}
        {speech.hasError && (
          <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            <p>{speech.errorMessage}</p>
            <button type="button" onClick={speech.retry} className="mt-2 inline-flex items-center gap-1 font-semibold text-white hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Retry speech recognition
            </button>
          </div>
        )}
        {!isDebateActive && stream && (
          <div className="mb-4 rounded-lg border border-[#425a8f] bg-[#172035] p-3 text-sm text-[#c3cff0]">
            Transcription starts with the debate timer and stops automatically when time expires.
          </div>
        )}

        <div className="space-y-3">
          <TranscriptCard
            label={`You · ${role.toUpperCase()}`}
            color={role === "pro" ? "emerald" : "rose"}
            text={localFinal}
            interim={speech.interimTranscript}
            empty={isDebateActive ? "Listening for your argument…" : "Your argument will appear here."}
          />
          <TranscriptCard
            label={`Opponent · ${role === "pro" ? "CON" : "PRO"}`}
            color={role === "pro" ? "rose" : "emerald"}
            text={opponentFinal}
            empty="Waiting for the opponent's argument…"
          />
        </div>
      </aside>
    </div>
  );
}

function TranscriptCard({
  label,
  color,
  text,
  interim,
  empty,
}: {
  label: string;
  color: "emerald" | "rose";
  text: string;
  interim?: string;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
        <span className={`h-2 w-2 rounded-full ${color === "emerald" ? "bg-emerald-400" : "bg-rose-400"}`} />
        {label}
      </div>
      <div className="max-h-40 min-h-24 overflow-y-auto text-sm leading-6 text-slate-200">
        {text || interim ? (
          <>
            {text}
            {interim && <span className="text-[#8aa7ed]"> {interim}</span>}
          </>
        ) : <span className="text-slate-500">{empty}</span>}
      </div>
    </div>
  );
}
