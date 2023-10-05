import { type Server as HTTPServer } from "http";

import { Server } from "socket.io";

interface InterviewState {
  question: string;
  code: string;
  language: string;
  active: boolean;
  interviewer: string;
}

interface Payload {
  index: number;
  userId: string;
  value: string | boolean;
}

class InterviewService {
  create(server: HTTPServer) {
    const io = new Server(server);
    const interviews: Map<string, InterviewState> = new Map();
    io.on("connection", (socket) => {
      const url = socket.handshake.headers.referer ?? "";
      const room = url.split("/")[4];
      if (!room) {
        socket.disconnect();
        return;
      }

      const obj: InterviewState = interviews.get(room) ?? {
        question: "",
        code: "",
        language: "python",
        active: false,
        interviewer: "",
      };

      if (!interviews.has(room)) {
        interviews.set(room, obj);
      }

      // Join room based on review ID
      socket.join(room);
      Object.keys(obj).forEach((key) => {
        socket.on(key, ({ index, userId, value }: Payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (obj as any)[key] = value;
          io.to(room).emit(key, { index, userId, value });
        });
      });
      socket.on("getState", () => socket.emit("state", obj));
    });
  }
}

export default new InterviewService();
