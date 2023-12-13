import { HydratedDocument, Schema, Types, model } from "mongoose";

import { ObjectIdsToStrings } from "./helpers";

type Progress = {
  pipeline: Types.ObjectId;
  application: Types.ObjectId;
  stageIndex: number;
  state: "pending" | "rejected" | "accepted";
};

type RawProgress = ObjectIdsToStrings<Progress>;

const ProgressSchema = new Schema<Progress>({
  pipeline: {
    type: Schema.Types.ObjectId,
    ref: "Pipeline",
    required: true,
  },
  application: {
    type: Schema.Types.ObjectId,
    ref: "Application",
    required: true,
  },
  stageIndex: {
    type: Number,
    required: true,
  },
  state: {
    type: String,
    enum: ["pending", "rejected", "accepted"],
    required: true,
  },
});

const ProgressModel = model("Progress", ProgressSchema);
type ProgressDocument = HydratedDocument<Progress>;

export { Progress, ProgressModel, ProgressDocument, RawProgress };
