"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client"; // Import Socket type


type SocketContextType = {
  socket: any | null; // 👈 use `any` to bypass type checking
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
  const [socket, setSocket] = useState<any | null>(null); // 👈 use `any` here too
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket.io",
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error: any) => { // 👈 error type ignored
      console.error("❌ Connection error:", error.message);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
