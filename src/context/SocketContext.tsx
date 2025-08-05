"use client";
import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

type SocketType = ReturnType<typeof io>;

type SocketContextType = {
  socket: SocketType | null;
  isConnected: boolean;
  connectionError: string | null;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket.io",
      autoConnect: true,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      forceNew: true,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket connected successfully");
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on("disconnect", (reason: string) => {
      console.log("🔌 Socket disconnected:", reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        socketInstance.connect();
      }
    });

    socketInstance.on("connect_error", (error: Error) => {
      console.error("❌ Socket connection error:", error.message);
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);
    });

    socketInstance.on("reconnect", (attemptNumber: number) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on("reconnect_error", (error: Error) => {
      console.error("❌ Socket reconnection error:", error.message);
      setConnectionError(`Reconnection failed: ${error.message}`);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed - max attempts reached");
      setConnectionError("Connection failed after multiple attempts. Please refresh the page.");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
};