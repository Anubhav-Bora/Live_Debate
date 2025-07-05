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
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Video Section */}
      <div className="flex-1">
        <div className="relative flex flex-col items-center justify-center p-4 w-full h-[400px] md:h-[500px]">
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
          
          {/* Video Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Remote (opponent) video - large */}
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
      </div>

      {/* Transcript Section */}
      <div className="w-full lg:w-80 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Transcripts</h3>
        
        {/* Your Transcript */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${role === 'pro' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">You ({role.toUpperCase()})</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
            <div className="text-sm text-gray-800">
              {transcript ? (
                <span>{transcript}</span>
              ) : (
                <span className="text-gray-400 italic">Speak to see your transcript...</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Opponent Transcript */}
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
                  <span className="text-gray-400 italic">Waiting for opponent's transcript...</span>
                )
              ) : (
                proTranscript ? (
                  <span>{proTranscript}</span>
                ) : (
                  <span className="text-gray-400 italic">Waiting for opponent's transcript...</span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Connection Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Status:</span>
            <span className={`font-medium ${connected ? 'text-green-600' : 'text-yellow-600'}`}>
              {connected ? 'Connected' : 'Connecting...'}
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