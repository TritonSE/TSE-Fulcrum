import { HydratedDocument, Schema, Types, model } from "mongoose";

import { PipelineIdentifier } from "../config";

import { ObjectIdsToStrings } from "./helpers";

type Progress = {
  pipelineIdentifier: PipelineIdentifier;
  application: Types.ObjectId;
  stageIndex: number;
  state: "pending" | "rejected" | "accepted";
};

type RawProgress = ObjectIdsToStrings<Progress>;

const ProgressSchema = new Schema<Progress>({
  pipelineIdentifier: {
    type: String,
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
