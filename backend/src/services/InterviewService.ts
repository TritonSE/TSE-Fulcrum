import { type Server as HTTPServer } from "http";

import { Server } from "socket.io";

import { InterviewModel, type InterviewState } from "../models/InterviewModel";
import { ReviewModel } from "../models/ReviewModel";

interface Payload {
  userId: string;
  key: string;
  value: string | boolean;
}

interface SelectionPayload {
  role: number;
  from: number;
  to: number;
}

const DB_UPDATE_INTERVAL = 10 * 1000; // 10 seconds

class InterviewService {
  interviews: Map<string, InterviewState>;

  constructor() {
    this.interviews = new Map();
  }

  // TODO: This function does no error handling.
  async upsert(interview: InterviewState) {
    const prev = this.interviews.get(interview.room);

    this.interviews.set(interview.room, interview);

    if (prev && new Date().getTime() < prev.lastUpdate.getTime() + DB_UPDATE_INTERVAL) {
      return;
    }

    interview.lastUpdate = new Date();
    const res = await InterviewModel.findOneAndUpdate({ room: interview.room }, interview, {
      new: true,
      upsert: true,
      rawResult: true,
    });

    if (res?.lastErrorObject?.updatedExisting === false) {
      // Add Interview to Review only if newly created
      await ReviewModel.update(
        { _id: interview.room },
        { interview: res.lastErrorObject.upserted }
      );
    }
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
        io.to(room).emit("message", payload);
        await this.upsert(obj);
      });
      socket.on("select", (payload: SelectionPayload) => {
        io.to(room).emit("select", payload);
      });
      socket.on("getState", () => socket.emit("state", obj));
    });
  }
}

export default new InterviewService();
