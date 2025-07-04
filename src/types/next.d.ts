import { Server as HTTPServer } from "http";
import { Socket } from "net";
import { Server as IOServer } from "socket.io";

declare module 'simple-peer';

export type NextApiResponseServerIO = {
  socket: Socket & {
    server: HTTPServer & {
      io?: IOServer;
    };
  };
  end: () => void;
};
