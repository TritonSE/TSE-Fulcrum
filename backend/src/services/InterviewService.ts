import https from "node:https";

import { Server } from "socket.io";

import env from "../env";
import { InterviewModel } from "../models/InterviewModel";
import { ReviewModel } from "../models/ReviewModel";

import type { InterviewState } from "../models/InterviewModel";
import type { Server as HTTPServer } from "node:http";

type ValidKeys = "question" | "code" | "language" | "active" | "timerStart" | "stage";

type Payload = {
  userId: string;
  key: ValidKeys;
  value: string | boolean | number;
};

type SelectionPayload = {
  role: number;
  from: number;
  to: number;
};

type Role = "interviewer" | "interviewee";

// Marks a boundary between parts in the question markdown, e.g. `<!-- PART 1 -->`.
// The number is purely a human-readable label - part order is determined by where
// the markers fall in the document, not by the number written in them.
const PART_MARKER = /<!--\s*PART\s+\d+\s*-->/;

function splitQuestionParts(question: string): string[] {
  return question.split(PART_MARKER).map((part) => part.trim());
}

function clampStage(stage: number, partCount: number): number {
  if (partCount <= 0) return 0;
  return Math.min(Math.max(stage, 0), partCount - 1);
}

function getVisibleQuestion(question: string, stage: number): string {
  const parts = splitQuestionParts(question);
  const visibleThrough = clampStage(stage, parts.length);

  return parts.slice(0, visibleThrough + 1).join("\n\n");
}

function roomForRole(room: string, role: Role): string {
  return `${room}:${role}`;
}

class InterviewService {
  interviews: Map<string, InterviewState>;

  questionPlaceholder: string;

  constructor() {
    this.interviews = new Map();
    this.questionPlaceholder = "";

    this.fetchReadme().then((readme) => {
      this.questionPlaceholder = readme ?? "";
    }, console.error);
  }

  async fetchReadme(): Promise<string | null> {
    // Built-in HTTP/S is not natively Promisified
    return new Promise((resolve) => {
      let out = "";
      https
        .get(env.README_URL, (res) => {
          console.info(`Interview README request responded with code ${res.statusCode}`);
          res.on("data", (data) => {
            out += data;
          });
          res.on("end", () => {
            resolve(out);
          });
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
    const res = await InterviewModel.findOneAndUpdate(
      { room: interview.room },
      { $set: interview },
      {
        new: true,
        upsert: true,
        rawResult: true,
      },
    );

    if (res?.lastErrorObject?.updatedExisting === false) {
      // Add Interview to Review only if newly created
      await ReviewModel.findOneAndUpdate(
        { _id: interview.room },
        { interview: res.lastErrorObject.upserted },
      );
    }
  }

  /* Fetch room state, no database writes  */
  async getRoomState(room: string): Promise<InterviewState> {
    const roomInMem = this.interviews.get(room);

    if (roomInMem) return roomInMem;

    const roomFromDB = await InterviewModel.findOne({ room }).lean();

    if (roomFromDB) {
      this.interviews.set(room, roomFromDB);
      return roomFromDB as InterviewState;
    }

    const defaultRoom: InterviewState = {
      room,
      question: (await this.fetchReadme()) ?? this.questionPlaceholder,
      code: "# Write your code here",
      language: "python",
      active: false,
      timerStart: 0,
      lastUpdate: new Date(),
      stage: 0,
    };

    this.interviews.set(room, defaultRoom);

    return defaultRoom;
  }

  // State as seen by a given role:
  // Interviewers will receive full question.
  // Interviewees will only receive the question up to a certain stage
  stateForRole(obj: InterviewState, role: Role): InterviewState {
    if (role === "interviewer") return obj;

    return { ...obj, question: getVisibleQuestion(obj.question, obj.stage) };
  }

  create(server: HTTPServer): void {
    const io = new Server(server);
    io.on("connection", async (socket) => {
      const url = socket.handshake.headers.referer ?? "";
      const room = url.split("/")[4];

      if (!room) {
        socket.disconnect();
        return;
      }

      const role: Role = url.includes("/review/") ? "interviewer" : "interviewee";

      // Join room based on review ID, plus a role-specific room so question
      // content can be gated: interviewees only ever get parts 0..stage.
      await socket.join(room);
      await socket.join(roomForRole(room, role));

      socket.on("message", async (payload: Payload) => {
        const obj = await this.getRoomState(room);

        if (!obj.active && payload.key !== "active") return;

        // TypeScript is being weird about this dynamic property access
        // eslint-disable-next-line ts/no-unsafe-member-access
        (obj as any)[payload.key] = payload.value;

        if (payload.key === "question" || payload.key === "stage") {
          // Role-specific handling. Interviewer gets full question,
          // interviewee gets gated question.
          // Only for question/stage payloads
          io.to(roomForRole(room, "interviewer")).emit("message", payload);
          io.to(roomForRole(room, "interviewee")).emit("message", {
            userId: payload.userId,
            key: "question",
            value: getVisibleQuestion(obj.question, obj.stage),
          });
        } else {
          // All other payloads can pass through
          io.to(room).emit("message", payload);
        }

        await this.upsert(obj);
      });
      socket.on("select", (payload: SelectionPayload) => {
        io.to(room).emit("select", payload);
      });
      socket.on("save", async () => {
        await this.upsert(await this.getRoomState(room), true);
      });
      socket.on("getState", async () => {
        const obj = await this.getRoomState(room);
        socket.emit("state", this.stateForRole(obj, role));
      });
    });
  }
}

export default new InterviewService();
