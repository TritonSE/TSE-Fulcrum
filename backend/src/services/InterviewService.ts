import { type Server as HTTPServer } from "http";

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

const questionPlaceholder = `# TSE Technical Interview

Welcome to TSE's technical interview for the Developer role!

## Logistics

* You will have **50 minutes** to work on a programming task with multiple parts.
* You can **choose any programming language**, but the task may be easier in some languages than others.
* You **can't run your code**, but you'll still have syntax highlighting and autocomplete.
* You **can't use any documentation or other resources**, but you shouldn't need to.
  * It's okay if you don't remember the exact name of a function (for example), as long as you communicate this with your interviewers, and everyone understands what you mean.
* You **can't use any external code other than your language's standard library**, but you shouldn't need to.
  * This includes \`numpy\` in Python, \`boost\` in C++, or similar external libraries.
  * This does *not* include anything under the \`java.*\` namespace in Java, anything under the \`std\` namespace in C++, or similar standard library functionality.
* The function signatures we provide should be treated as pseudocode; you are free to modify them to better suit the language you are using.
  * For example: If you are using Java, you are welcome to use \`List<String>\` instead of \`String[]\`.
* You can ask clarifying questions at any time.
* If you get stuck, your interviewers can give you hints.
* The questions are designed to be long, with multiple parts, so you aren't expected to finish everything.
* You **can't keep or share the problem statement or your solution code**, to maintain the integrity of the interview process.

## What we're looking for

* **Programming and problem-solving skills**: find a solution to each task, and implement that solution in code.
* **Communication skills**: read the prompt carefully, think out loud to help your interviewers understand your thought process, and pay attention to any hints your interviewers may give you.
* **Code quality**: write well-structured and understandable code.
* **Testing**: ask clarifying questions, consider edge cases, and trace your code out loud to make sure it works.

## Getting started

1. **Tell your interviewer which programming language you want to use.** If you want, you can change your mind once you see the problem.
1. If you have any questions, please ask your interviewers now.
1. When you are ready to begin, your interviewers will paste the problem description at the bottom of this README file, and your 50 minute timer will begin.

# Problem description placeholder

This will be replaced with the problem description.`;

class InterviewService {
  interviews: Map<string, InterviewState>;

  constructor() {
    this.interviews = new Map();
  }

  // TODO: This function does no error handling.
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
          question: questionPlaceholder,
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
