import https from "node:https";

import { Server } from "socket.io";

import env from "../env";
import { InterviewModel } from "../models/InterviewModel";
import { ReviewModel } from "../models/ReviewModel";

import type { InterviewState } from "../models/InterviewModel";
import type { Server as HTTPServer } from "node:http";

type ValidKeys = "question" | "code" | "language" | "active" | "timerStart" | "stage";

type InterviewVersion = "firstYear" | "secondYear";

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

type FocusPayload = {
  role: number;
  focused: boolean;
};

type FetchPayload = {
  userId: string;
  version: InterviewVersion;
};

type Role = "interviewer" | "interviewee";

function readmeFetchOptions(url: string): https.RequestOptions {
  const parsed = new URL(url);

  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    headers: { authorization: `token ${env.GITHUB_PAT}` },
  };
}

const INTERVIEW_README_FETCH_OPTIONS: Record<InterviewVersion, https.RequestOptions> = {
  firstYear: readmeFetchOptions(env.README_URL_FIRSTYEAR),
  secondYear: readmeFetchOptions(env.README_URL_SECONDYEAR),
};

// Marks a boundary between parts in the question markdown, e.g. `<!-- PART -->`.
const PART_MARKER = /<!--\s*PART\s*-->/;

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

    this.fetchReadme(env.README_URL).then((readme) => {
      this.questionPlaceholder = readme ?? "";
    }, console.error);
  }

  async fetchReadme(options: string | https.RequestOptions | URL): Promise<string | null> {
    // Built-in HTTP/S is not natively Promisified
    return new Promise((resolve) => {
      let out = "";
      https
        .get(options, (res) => {
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
      return roomFromDB;
    }

    const defaultRoom: InterviewState = {
      room,
      question: (await this.fetchReadme(env.README_URL)) ?? this.questionPlaceholder,
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
      socket.on("focus", (payload: FocusPayload) => {
        io.to(room).emit("focus", payload);
      });
      socket.on(
        "fetch",
        async (payload: FetchPayload, ack?: (question: string | null) => void) => {
          const obj = await this.getRoomState(room);
          const { userId, version } = payload;
          const question = await this.fetchReadme(INTERVIEW_README_FETCH_OPTIONS[version]);
          if (!question) {
            ack?.(null);
            return;
          }

          obj.question = question;
          obj.stage = 0;

          // Broadcast to any other connected sockets for this role (e.g. a second
          // interviewer tab). The requesting socket applies the result itself via ack,
          // since "message" events matching its own userId are ignored on the client.
          socket.to(roomForRole(room, "interviewer")).emit("message", {
            userId,
            key: "question",
            value: question,
          } as Payload);
          socket.to(roomForRole(room, "interviewer")).emit("message", {
            userId,
            key: "stage",
            value: 0,
          } as Payload);
          io.to(roomForRole(room, "interviewee")).emit("message", {
            userId,
            key: "question",
            value: getVisibleQuestion(question, 0),
          } as Payload);

          await this.upsert(obj);

          ack?.(question);
        },
      );
    });
  }
}

export default new InterviewService();
