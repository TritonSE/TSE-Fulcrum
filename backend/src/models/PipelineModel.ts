import { HydratedDocument, Schema, Types, model } from "mongoose";

import { ObjectIdsToStrings } from "./helpers";

type Pipeline = {
  // Each submitted application uses pipeline identifiers to indicate
  // which roles the applicant is applying to.
  _id: Types.ObjectId;
  identifier: string;
  name: string;
};

type RawPipeline = ObjectIdsToStrings<Pipeline>;

const PipelineSchema = new Schema<Pipeline>({
  identifier: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
});

const PipelineModel = model("Pipeline", PipelineSchema);
type PipelineDocument = HydratedDocument<Pipeline>;

export { PipelineModel, PipelineDocument, Pipeline, RawPipeline };
