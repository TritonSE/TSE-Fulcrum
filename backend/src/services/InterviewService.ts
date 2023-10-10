import { type Server as HTTPServer } from "http";

import { Server } from "socket.io";

import { InterviewModel, type InterviewState } from "../models/InterviewModel";

interface Payload {
  userId: string;
  key: string;
  value: string | boolean;
}

const DB_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

class InterviewService {
  interviews: Map<string, InterviewState>;

  constructor() {
    this.interviews = new Map();
  }

  async upsert(interview: InterviewState) {
    const prev = this.interviews.get(interview.room);

    this.interviews.set(interview.room, interview);

    if (prev && new Date().getTime() < prev.lastUpdate.getTime() + DB_UPDATE_INTERVAL) {
      return true;
    }

    interview.lastUpdate = new Date();
    return InterviewModel.findOneAndUpdate({ room: interview.room }, interview, { upsert: true });
  }

  async create(server: HTTPServer) {
    const io = new Server(server);
    io.on("connection", async (socket) => {
      const url = socket.handshake.headers.referer ?? "";
      const room = url.split("/")[4];
      if (!room) {
        socket.disconnect();
        return;
      }

      const obj = this.interviews.get(room) ??
        (await InterviewModel.findOne({ room })) ?? {
          room,
          question: "# TSE Technical Interview",
          code: "# Write your code here",
          language: "python",
          active: false,
          lastUpdate: new Date(),
        };
      if (!this.interviews.has(room)) await this.upsert(obj);

      // Join room based on review ID
      socket.join(room);
      socket.on("message", async (payload: Payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as any)[payload.key] = payload.value;
        await this.upsert(obj);

        io.to(room).emit("message", payload);
      });
      socket.on("getState", () => socket.emit("state", obj));
    });
  }
}

export default new InterviewService();
