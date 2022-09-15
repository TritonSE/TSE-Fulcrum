import { HydratedDocument, model, Schema, Types } from "mongoose";

interface FormField {
  type: "string" | "number" | "boolean";
  choices: unknown[];
  allowOther: boolean;
  label: string;
  description: string;
}

const FormFieldSchema = new Schema<FormField>({
  type: {
    type: String,
    enum: ["string", "number", "boolean"],
    required: true,
  },
  choices: {
    type: Array,
    required: true,
  },
  allowOther: {
    type: Boolean,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

interface Stage {
  pipeline: Types.ObjectId;
  pipelineIndex: number;
  numReviews: number;
  name: string;
  fields: Record<string, FormField>;
  fieldOrder: string[];
  reviewerEmails: string[];
  autoAssignReviewers: boolean;
  notifyReviewersWhenAssigned: boolean;
}

const StageSchema = new Schema<Stage>({
  pipeline: {
    type: Schema.Types.ObjectId,
    ref: "Pipeline",
    required: true,
  },
  pipelineIndex: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  numReviews: {
    type: Number,
    required: true,
  },
  fields: {
    type: Map,
    of: FormFieldSchema,
    required: true,
  },
  fieldOrder: {
    type: [String],
    required: true,
  },
  reviewerEmails: {
    type: [String],
    required: true,
  },
  autoAssignReviewers: {
    type: Boolean,
    required: true,
  },
  notifyReviewersWhenAssigned: {
    type: Boolean,
    required: true,
  },
});

// Used to get all stages for a pipeline, ordered by index.
StageSchema.index({ pipeline: 1, pipelineIndex: 1 });

const StageModel = model("Stage", StageSchema);
type StageDocument = HydratedDocument<Stage>;

export { Stage, StageModel, StageDocument };
