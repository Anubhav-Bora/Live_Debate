"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

type SocketContextValue = { socket: Socket | null; isConnected: boolean };

const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const instance = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      withCredentials: true,
    });
    instance.on("connect", () => setIsConnected(true));
    instance.on("disconnect", () => setIsConnected(false));
    instance.on("connect_error", (error) => {
      console.warn("Realtime connection unavailable:", error.message);
      setIsConnected(false);
    });
    setSocket(instance);
    return () => {
      instance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isLoaded, user?.id]);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
}
