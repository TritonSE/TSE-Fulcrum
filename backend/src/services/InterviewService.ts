import { type Server as HTTPServer } from "http";
import https from "node:https";

import { Server } from "socket.io";

import env from "../env";
import { InterviewModel, type InterviewState } from "../models/InterviewModel";
import { ReviewModel } from "../models/ReviewModel";

interface Payload {
  userId: string;
  key: string;
  value: string | boolean | number;
}

interface SelectionPayload {
  role: number;
  from: number;
  to: number;
}

class InterviewService {
  interviews: Map<string, InterviewState>;

  questionPlaceholder: string;

  constructor() {
    this.interviews = new Map();
    this.questionPlaceholder = "";

    (async () => {
      this.questionPlaceholder = (await this.fetchReadme()) ?? "";
    })();
  }

  fetchReadme(): Promise<string | null> {
    // Built-in HTTP/S is not natively Promisified
    return new Promise((resolve) => {
      let out = "";
      https
        .get(env.README_URL, (res) => {
          console.log("Interview README request responded with code " + res.statusCode);
          res.on("data", (data) => {
            out += data;
          });
          res.on("end", () => resolve(out));
        })
        .on("error", (err) => {
          console.error("Interview README request failed with error:");
          console.error(err);
          resolve(null);
        });
    });
  }

  // TODO: This function does no error handling
  async upsert(interview: InterviewState, force = false) {
    const prev = this.interviews.get(interview.room);

    this.interviews.set(interview.room, interview);

    if (
      !force &&
      prev &&
      new Date().getTime() < prev.lastUpdate.getTime() + env.DB_UPDATE_INTERVAL
    ) {
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
        { interview: res.lastErrorObject.upserted },
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
          question: (await this.fetchReadme()) ?? this.questionPlaceholder,
          code: "# Write your code here",
          language: "python",
          active: false,
          timerStart: 0,
          lastUpdate: new Date(),
        };
      if (!this.interviews.has(room)) await this.upsert(obj);

      // Join room based on review ID
      socket.join(room);
      socket.on("message", async (payload: Payload) => {
        if (!obj.active && payload.key !== "active") return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as any)[payload.key] = payload.value;
        io.to(room).emit("message", payload);
        await this.upsert(obj);
      });
      socket.on("select", (payload: SelectionPayload) => {
        io.to(room).emit("select", payload);
      });
      socket.on("save", async () => {
        await this.upsert(obj, true);
      });
      socket.on("getState", () => socket.emit("state", obj));
    });
  }
}

export default new InterviewService();
