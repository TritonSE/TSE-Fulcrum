import { HydratedDocument, model, Schema } from "mongoose";

interface InterviewState {
  room: string;
  question: string;
  code: string;
  language: string;
  active: boolean;
  lastUpdate: Date;
}

Schema.Types.String.checkRequired((v) => typeof v === "string");

const InterviewSchema = new Schema<InterviewState>({
  room: {
    type: String,
    required: true,
  },

  question: {
    type: String,
    required: true,
  },

  code: {
    type: String,
    required: true,
  },

  language: {
    type: String,
    required: true,
  },

  active: {
    type: Boolean,
    required: true,
  },

  lastUpdate: {
    type: Date,
    required: true,
  },
});

const InterviewModel = model("Interview", InterviewSchema);
type InterviewDocument = HydratedDocument<InterviewState>;

export { InterviewModel, InterviewDocument, InterviewState };
