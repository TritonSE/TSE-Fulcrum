import { HydratedDocument, model, Schema } from "mongoose";

interface Pipeline {
  // Each submitted application uses pipeline identifiers to indicate
  // which roles the applicant is applying to.
  identifier: string;
  name: string;
}

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

export { PipelineModel, PipelineDocument, Pipeline };
