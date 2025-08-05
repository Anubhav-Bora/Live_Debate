import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { Server as IOServer } from "socket.io";
import type { NextApiResponse } from "next";

// Optional: if you're using Peer.js or WebRTC with `simple-peer`
declare module 'simple-peer';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: IOServer;
    };
  };
};
