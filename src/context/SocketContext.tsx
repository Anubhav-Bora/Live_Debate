"use client";
import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

type SocketType = ReturnType<typeof io>;

type SocketContextType = {
  socket: SocketType | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Determine the correct socket URL based on environment
    const socketUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    console.log("[SocketContext] Connecting to:", socketUrl);

    const socketInstance = io(socketUrl, {
      path: "/api/socket.io",
      autoConnect: true,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      forceNew: true
    });

    socketInstance.on("connect", () => {
      console.log("[SocketContext] Connected to socket server");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("[SocketContext] Disconnected from socket server:", reason);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error: Error) => {
      console.error("❌ Socket connection error:", error.message);
      setIsConnected(false);
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log("[SocketContext] Reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
    });

    socketInstance.on("reconnect_error", (error: Error) => {
      console.error("❌ Socket reconnection error:", error.message);
    });

    setSocket(socketInstance);

    return () => {
      console.log("[SocketContext] Cleaning up socket connection");
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};