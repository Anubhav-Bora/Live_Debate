import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface VideoDebateRoomProps {
  debateId: string;
  userId: string;
  role: "pro" | "con";
}

export default function VideoDebateRoom({ debateId, userId, role }: VideoDebateRoomProps) {
  const { socket } = useSocket();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<any>(null);
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

  // Get available video devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        // Select the first non-virtual camera (usually the real one)
        const realCamera = videoInputs.find(device => 
          !device.label.toLowerCase().includes('virtual') && 
          !device.label.toLowerCase().includes('obs')
        );
        setSelectedDeviceId(realCamera?.deviceId || videoInputs[0]?.deviceId || "");
      })
      .catch(err => console.error("Error enumerating devices:", err));
  }, []);

  // Get user media with selected device
  useEffect(() => {
    if (!selectedDeviceId) return;
    
    navigator.mediaDevices.getUserMedia({ 
      video: { deviceId: { exact: selectedDeviceId } }, 
      audio: true 
    })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
        setMediaError(null);
      })
      .catch((err) => {
        setMediaError("Could not access webcam/mic: " + err.message);
        console.error("[VideoDebateRoom] getUserMedia error:", err);
      });
  }, [selectedDeviceId]);

  // Join debate room and handle signaling
  useEffect(() => {
    if (!socket || !stream) return;
    console.log(`[VideoDebateRoom] Joining debate room: debate_${debateId} as ${role} (${userId})`);
    socket.emit("join_debate", { debateId, userId, role });

    // Wait a bit for the other participant to potentially join
    const timeout = setTimeout(() => {
      // Only one peer should initiate (e.g., pro)
      const initiator = role === "pro";
      console.log(`[VideoDebateRoom] Creating peer as ${initiator ? 'initiator' : 'receiver'}`);
      
      // ICE servers for WebRTC (STUN/TURN)
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN server for better connectivity across networks
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
        config: { iceServers }
      });
      setPeer(p);

      p.on("signal", (data: any) => {
        console.log("[VideoDebateRoom] Sending signal:", data);
        socket.emit("signal", { debateId, userId, signal: data });
      });

      p.on("stream", (remoteStream: MediaStream) => {
        console.log("[VideoDebateRoom] Received remote stream with tracks:", remoteStream.getTracks().map(t => t.kind));
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch((e) => {
            console.warn("[VideoDebateRoom] Remote video play error:", e);
          });
        }
        setConnected(true);
        setMediaError(null);
        console.log("[VideoDebateRoom] Received remote stream.");
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
      });

      // Listen for signaling data from the other peer
      const onSignal = ({ userId: fromId, signal }: any) => {
        if (fromId !== userId) {
          console.log("[VideoDebateRoom] Received signal from other peer:", signal);
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
    }, 2000); // Wait 2 seconds for other participant to join

    return () => {
      clearTimeout(timeout);
    };
  }, [socket, stream, debateId, userId, role]);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && stream && lastLocalStream.current !== stream) {
      localVideoRef.current.srcObject = stream;
      lastLocalStream.current = stream;
      localVideoRef.current.play().catch((e) => {
        console.warn("[VideoDebateRoom] Local video play error:", e);
      });
    }
    if (remoteVideoRef.current && remoteStream && lastRemoteStream.current !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      lastRemoteStream.current = remoteStream;
      remoteVideoRef.current.play().catch((e) => {
        console.warn("[VideoDebateRoom] Remote video play error:", e);
      });
    }
  }, [stream, remoteStream]);

  // Enable speech recognition only when connected and stream is available
  const transcript = useSpeechRecognition(!!stream);

  // Emit transcript updates as they change
  useEffect(() => {
    if (!socket || !debateId || !role) return;
    socket.emit("transcript_update", {
      debateId,
      userId,
      role,
      transcript,
    });
  }, [transcript, socket, debateId, userId, role]);

  // Listen for transcript updates from server
  useEffect(() => {
    if (!socket) return;
    const onTranscriptUpdate = ({ role: updateRole, transcript: updateTranscript }: { role: string, transcript: string }) => {
      if (updateRole === "pro") setProTranscript(updateTranscript);
      if (updateRole === "con") setConTranscript(updateTranscript);
    };
    socket.on("transcript_update", onTranscriptUpdate);
    return () => {
      socket.off("transcript_update", onTranscriptUpdate);
    };
  }, [socket]);

  // Set own transcript immediately for local user
  useEffect(() => {
    if (role === "pro") setProTranscript(transcript);
    if (role === "con") setConTranscript(transcript);
  }, [transcript, role]);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 w-full h-[500px] md:h-[600px]">
      {mediaError && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded border border-red-300 w-full text-center">
          {mediaError}
        </div>
      )}
      
      {/* Camera Selection */}
      {videoDevices.length > 1 && (
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
      
      {/* Video Container with Overlay Transcripts */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Remote (opponent) video - large */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="rounded border bg-black w-full h-full object-cover"
            style={{ minHeight: '350px', minWidth: '350px', maxHeight: '100%', maxWidth: '100%' }}
          />
        ) : (
          <div className="rounded border bg-gray-900 w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-2xl mb-2">👤</div>
              <div className="text-lg font-medium">Waiting for opponent...</div>
              <div className="text-sm text-gray-400 mt-2">
                {connected ? 'Connected - video loading...' : 'Establishing connection...'}
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
        
        {/* Local (own) video - small overlay */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-4 right-4 rounded border bg-black shadow-lg w-32 h-24 object-cover z-10"
          style={{ border: '2px solid white' }}
        />
        
        {/* Transcript Overlays */}
        <div className="absolute top-4 left-4 right-4 z-20">
          {/* Your Transcript */}
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 mb-2">
            <div className="text-xs text-gray-300 mb-1">You ({role}):</div>
            <div className="text-sm text-white">
              {transcript || <span className="text-gray-400">Speak to see transcript...</span>}
            </div>
          </div>
          
          {/* Opponent Transcript */}
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3">
            <div className="text-xs text-gray-300 mb-1">Opponent:</div>
            <div className="text-sm text-white">
              {role === "pro" ? conTranscript : proTranscript || <span className="text-gray-400">Waiting for transcript...</span>}
            </div>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            connected 
              ? 'bg-green-500/80 text-white' 
              : 'bg-yellow-500/80 text-white'
          }`}>
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* Debug Info (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-20 left-4 z-20 bg-black/80 text-white text-xs p-2 rounded">
            <div>Role: {role}</div>
            <div>Connected: {connected ? 'Yes' : 'No'}</div>
            <div>Local Stream: {stream ? 'Yes' : 'No'}</div>
            <div>Remote Stream: {remoteStream ? 'Yes' : 'No'}</div>
            <div>Peer: {peer ? 'Active' : 'None'}</div>
          </div>
        )}
      </div>
    </div>
  );
}