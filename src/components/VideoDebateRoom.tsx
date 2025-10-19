import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { useSocket } from "@/context/SocketContext";
import { useAdvancedSpeechRecognition } from "@/hooks/useAdvancedSpeechRecognition";

// Define custom types
type SignalCallback = (data: SignalData) => void;
type StreamCallback = (stream: MediaStream) => void;
type ErrorCallback = (error: Error) => void;
type ConnectCallback = () => void;
type CloseCallback = () => void;
type IceStateChangeCallback = (state: string) => void;

type PeerInstance = {
  on(event: "signal", callback: SignalCallback): void;
  on(event: "stream", callback: StreamCallback): void;
  on(event: "error", callback: ErrorCallback): void;
  on(event: "connect", callback: ConnectCallback): void;
  on(event: "close", callback: CloseCallback): void;
  on(event: "iceStateChange", callback: IceStateChangeCallback): void;
  off(event: "signal", callback: SignalCallback): void;
  off(event: "stream", callback: StreamCallback): void;
  off(event: "error", callback: ErrorCallback): void;
  off(event: "connect", callback: ConnectCallback): void;
  off(event: "close", callback: CloseCallback): void;
  off(event: "iceStateChange", callback: IceStateChangeCallback): void;
  signal: (data: SignalData) => void;
  destroy: () => void;
};

interface SignalData {
  type: string;
  sdp?: string;
  candidate?: {
    candidate: string;
    sdpMid?: string;
    sdpMLineIndex?: number;
  };
}

interface VideoDebateRoomProps {
  debateId: string;
  userId: string;
  role: "pro" | "con";
}

interface TranscriptUpdateData {
  role: string;
  transcript: string;
}

interface SignalEventData {
  userId: string;
  signal: SignalData;
}

export default function VideoDebateRoom({ debateId, userId, role }: VideoDebateRoomProps) {
  const { socket, isConnected } = useSocket();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<PeerInstance | null>(null);
  const [connected, setConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [proTranscript, setProTranscript] = useState("");
  const [conTranscript, setConTranscript] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const lastLocalStream = useRef<MediaStream | null>(null);
  const lastRemoteStream = useRef<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  
  // User interaction states
  const [userInteracted, setUserInteracted] = useState(false);
  const [showCameraPrompt, setShowCameraPrompt] = useState(true);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Enhanced speech recognition with better configuration
  const {
    transcript,
    finalTranscript,
    interimTranscript,
    isListening,
    hasError: speechError,
    errorMessage: speechErrorMessage,
    isSupported: speechSupported,
    clearTranscript,
  } = useAdvancedSpeechRecognition(!!stream && userInteracted, {
    language: "en-US",
    continuous: true,
    interimResults: true,
  });

  // Keep refs updated
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  // AUTO STOP CAMERA on component unmount ONLY
  useEffect(() => {
    return () => {
      console.log("[VideoDebateRoom] Component unmounting - stopping camera...");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log("[VideoDebateRoom] Stopped track:", track.kind);
        });
      }
      if (peerRef.current) {
        console.log("[VideoDebateRoom] Destroying peer connection...");
        peerRef.current.destroy();
      }
    };
  }, []);

  // Get available video devices - ONLY enumerate, don't auto-start
  useEffect(() => {
    // Request permissions first, then enumerate
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        // Stop the stream immediately - we just needed permissions
        stream.getTracks().forEach(track => track.stop());
        
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(devices => {
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        const realCamera = videoInputs.find(device =>
          !device.label.toLowerCase().includes('virtual') &&
          !device.label.toLowerCase().includes('obs')
        );
        setSelectedDeviceId(realCamera?.deviceId || videoInputs[0]?.deviceId || "");
      })
      .catch(err => {
        console.error("Error getting device permissions:", err);
        setMediaError("Could not access camera permissions: " + err.message);
      });
  }, []);

  // Manual camera start function
  const handleStartCamera = async () => {
    if (!selectedDeviceId) {
      setMediaError("No camera device selected");
      return;
    }

    setIsStartingCamera(true);
    setUserInteracted(true);
    setShowCameraPrompt(false);

    try {
      console.log("[VideoDebateRoom] Starting camera with user interaction...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: selectedDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      console.log("[VideoDebateRoom] Camera started successfully");
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }
      setMediaError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[VideoDebateRoom] getUserMedia error:", error);
      setMediaError("Could not access camera: " + (error.message || "Unknown error"));
      setUserInteracted(false);
      setShowCameraPrompt(true);
    }
    finally {
      setIsStartingCamera(false);
    }
  };

  // Join debate room and handle signaling - WAIT for socket connection
  useEffect(() => {
    if (!socket || !isConnected || !stream) {
      console.log("[VideoDebateRoom] Waiting for requirements:", {
        socket: !!socket,
        isConnected,
        stream: !!stream
      });
      return;
    }

    console.log(`[VideoDebateRoom] Joining debate room: debate_${debateId} as ${role} (${userId})`);
    socket.emit("join_debate", { debateId, userId, role });

    // Reduced timeout and better error handling
    const timeout = setTimeout(() => {
      const initiator = role === "pro";
      console.log(`[VideoDebateRoom] Creating peer as ${initiator ? 'initiator' : 'receiver'}`);

      // Enhanced ICE servers for production
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ];

      const p = new SimplePeer({
        initiator,
        trickle: false,
        stream,
        config: { 
          iceServers,
          iceTransportPolicy: 'all',
        }
      }) as PeerInstance;

      setPeer(p);

      p.on("signal", (data: SignalData) => {
        console.log("[VideoDebateRoom] Sending signal:", data.type);
        if (socket && isConnected) {
          socket.emit("signal", { debateId, userId, signal: data });
        } else {
          console.error("[VideoDebateRoom] Cannot send signal - socket not connected");
        }
      });

      p.on("stream", (remoteStream: MediaStream) => {
        console.log("[VideoDebateRoom] Received remote stream");
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(console.warn);
        }
        setConnected(true);
        setMediaError(null);
      });

      p.on("error", (err: Error) => {
        console.error("[VideoDebateRoom] Peer connection error:", err);
        setMediaError("Connection error: " + err.message);
        setConnected(false);
      });

      p.on("connect", () => {
        console.log("[VideoDebateRoom] Peer connected successfully");
        setConnected(true);
        setMediaError(null);
      });

      p.on("close", () => {
        console.log("[VideoDebateRoom] Peer connection closed");
        setConnected(false);
      });

      p.on("iceStateChange", (state: string) => {
        console.log("[VideoDebateRoom] ICE connection state:", state);
        if (state === 'failed' || state === 'disconnected') {
          setConnected(false);
        }
      });

      const onSignal = ({ userId: fromId, signal }: SignalEventData) => {
        if (fromId !== userId) {
          console.log("[VideoDebateRoom] Received signal from other peer:", signal.type);
          try {
            p.signal(signal);
          } catch (err) {
            console.error("[VideoDebateRoom] Error signaling peer:", err);
          }
        }
      };

      socket.on("signal", onSignal);

      return () => {
        socket.off("signal", onSignal);
        if (p) {
          console.log("[VideoDebateRoom] Destroying peer connection");
          p.destroy();
        }
      };
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [socket, isConnected, stream, debateId, userId, role]);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && stream && lastLocalStream.current !== stream) {
      localVideoRef.current.srcObject = stream;
      lastLocalStream.current = stream;
      localVideoRef.current.play().catch(console.warn);
    }
    if (remoteVideoRef.current && remoteStream && lastRemoteStream.current !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      lastRemoteStream.current = remoteStream;
      remoteVideoRef.current.play().catch(console.warn);
    }
  }, [stream, remoteStream]);

  // Send transcript updates to other participants
  useEffect(() => {
    if (!socket || !isConnected || !debateId || !role) return;
    
    // Only send final transcript to avoid overwhelming the server
    if (finalTranscript) {
      socket.emit("transcript_update", {
        debateId,
        userId,
        role,
        transcript: finalTranscript,
      });
    }
  }, [finalTranscript, socket, isConnected, debateId, userId, role]);

  // Listen for transcript updates from other participants
  useEffect(() => {
    if (!socket || !isConnected) return;
    const onTranscriptUpdate = ({ role: updateRole, transcript: updateTranscript }: TranscriptUpdateData) => {
      if (updateRole === "pro") setProTranscript(updateTranscript);
      if (updateRole === "con") setConTranscript(updateTranscript);
    };
    socket.on("transcript_update", onTranscriptUpdate);
    return () => {
      socket.off("transcript_update", onTranscriptUpdate);
    };
  }, [socket, isConnected]);

  // Update local transcript display
  useEffect(() => {
    if (role === "pro") setProTranscript(transcript);
    if (role === "con") setConTranscript(transcript);
  }, [transcript, role]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      <div className="flex-1">
        <div className="relative flex flex-col items-center justify-center p-4 w-full h-[400px] md:h-[500px]">
          {/* Connection Status */}
          {!isConnected && (
            <div className="mb-4 p-2 bg-yellow-100 text-yellow-700 rounded border border-yellow-300 w-full text-center">
              Socket disconnected - trying to reconnect...
            </div>
          )}

          {mediaError && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded border border-red-300 w-full text-center">
              {mediaError}
            </div>
          )}

          {/* Speech Recognition Status */}
          {userInteracted && !speechSupported && (
            <div className="mb-4 p-2 bg-orange-100 text-orange-700 rounded border border-orange-300 w-full text-center">
              Speech recognition not supported in this browser
            </div>
          )}

          {userInteracted && speechError && speechErrorMessage && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded border border-red-300 w-full text-center">
              Speech recognition error: {speechErrorMessage}
            </div>
          )}

          {/* Camera Start Prompt */}
          {showCameraPrompt && !stream && (
            <div className="mb-4 p-4 bg-blue-100 text-blue-700 rounded border border-blue-300 w-full text-center">
              <h3 className="font-medium mb-2">Camera Access Required</h3>
              <p className="text-sm mb-3">Click to start your camera for the video debate</p>
              <button
                onClick={handleStartCamera}
                disabled={isStartingCamera || !selectedDeviceId}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isStartingCamera ? "Starting Camera..." : "Start Camera"}
              </button>
            </div>
          )}

          {videoDevices.length > 1 && stream && (
            <div className="mb-4 w-full max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Camera:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900"
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative w-full h-full flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="rounded border bg-black w-full h-full object-cover"
                style={{ minHeight: '300px', minWidth: '300px', maxHeight: '100%', maxWidth: '100%' }}
              />
            ) : (
              <div className="rounded border bg-gray-900 w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-2xl mb-2">👤</div>
                  <div className="text-lg font-medium">Waiting for opponent...</div>
                  <div className="text-sm text-gray-400 mt-2">
                    {connected ? 'Connected - video loading...' : 
                     !isConnected ? 'Socket connecting...' :
                     !stream ? 'Camera not started' :
                     'Establishing connection...'}
                  </div>
                  <div className="text-xs text-gray-500 mt-4 max-w-xs">
                    {role === 'pro'
                      ? 'Share the join code with your opponent to start the video debate'
                      : 'Waiting for Pro participant to join...'
                    }
                  </div>
                </div>
              </div>
            )}

            {stream && (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute bottom-4 right-4 rounded border bg-black shadow-lg w-32 h-24 object-cover z-10"
                style={{ border: '2px solid white' }}
              />
            )}

            <div className="absolute top-4 right-4 z-20">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                connected && isConnected
                  ? 'bg-green-500/80 text-white'
                  : 'bg-yellow-500/80 text-white'
              }`}>
                {connected && isConnected ? 'Connected' : 
                 !isConnected ? 'Socket Connecting...' : 'Connecting...'}
              </div>
            </div>

            {/* Speech Recognition Status Indicator */}
            {userInteracted && speechSupported && (
              <div className="absolute top-4 left-4 z-20">
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  isListening 
                    ? 'bg-red-500/80 text-white animate-pulse' 
                    : 'bg-gray-500/80 text-white'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-white' : 'bg-gray-300'}`}></div>
                  {isListening ? 'Listening...' : 'Speech Recognition'}
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <div className="absolute bottom-20 left-4 z-20 bg-black/80 text-white text-xs p-2 rounded">
                <div>Role: {role}</div>
                <div>Socket Connected: {isConnected ? 'Yes' : 'No'}</div>
                <div>Peer Connected: {connected ? 'Yes' : 'No'}</div>
                <div>Local Stream: {stream ? 'Yes' : 'No'}</div>
                <div>Remote Stream: {remoteStream ? 'Yes' : 'No'}</div>
                <div>Peer: {peer ? 'Active' : 'None'}</div>
                <div>User Interacted: {userInteracted ? 'Yes' : 'No'}</div>
                <div>Speech Listening: {isListening ? 'Yes' : 'No'}</div>
                <div>Speech Supported: {speechSupported ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-80 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Live Transcripts</h3>
          {userInteracted && speechSupported && (
            <button
              onClick={clearTranscript}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
              title="Clear transcript"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${role === 'pro' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">You ({role.toUpperCase()})</span>
            {userInteracted && speechSupported && (
              <div className={`ml-auto text-xs px-2 py-1 rounded ${
                isListening 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {isListening ? '🎤 Listening' : '🎤 Ready'}
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
            <div className="text-sm text-gray-800">
              {transcript ? (
                <div>
                  {/* Show final transcript in regular text */}
                  <span>{finalTranscript}</span>
                  {/* Show interim transcript in italics */}
                  {interimTranscript && (
                    <span className="italic text-gray-600"> {interimTranscript}</span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 italic">
                  {!userInteracted 
                    ? "Start camera to enable speech recognition..."
                    : !speechSupported 
                    ? "Speech recognition not supported..."
                    : speechError 
                    ? "Speech recognition error..."
                    : "Speak to see your transcript..."
                  }
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${role === 'pro' ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">Opponent ({role === 'pro' ? 'CON' : 'PRO'})</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
            <div className="text-sm text-gray-800">
              {role === "pro" ? (
                conTranscript ? (
                  <span>{conTranscript}</span>
                ) : (
                  <span className="text-gray-400 italic">Waiting for opponent&apos;s transcript...</span>
                )
              ) : (
                proTranscript ? (
                  <span>{proTranscript}</span>
                ) : (
                  <span className="text-gray-400 italic">Waiting for opponent&apos;s transcript...</span>
                )
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Socket:</span>
            <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Peer:</span>
            <span className={`font-medium ${connected ? 'text-green-600' : 'text-yellow-600'}`}>
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Speech:</span>
            <span className={`font-medium ${
              !userInteracted ? 'text-gray-400' :
              !speechSupported ? 'text-red-600' :
              speechError ? 'text-red-600' :
              isListening ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {!userInteracted ? 'Disabled' :
               !speechSupported ? 'Not Supported' :
               speechError ? 'Error' :
               isListening ? 'Listening' : 'Ready'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Role:</span>
            <span className="font-medium text-gray-700">{role.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}