import { HydratedDocument, model, Schema, Types } from "mongoose";

interface Submission {
  formIdentifier: string;
  fields: Record<string, string | number | boolean>;
  draft: boolean;
  ownerEmail: string;
  application: Types.ObjectId;
}

const SubmissionSchema = new Schema<Submission>({
  formIdentifier: {
    type: String,
    required: true,
  },
  fields: {
    type: Map,
    required: true,
  },
  draft: {
    type: Boolean,
    required: true,
  },
  ownerEmail: {
    type: String,
    required: true,
  },
  application: {
    type: Schema.Types.ObjectId,
    ref: "Application",
    required: true,
  },
});

const SubmissionModel = model("Submission", SubmissionSchema);
type SubmissionDocument = HydratedDocument<Submission>;

export { SubmissionModel, SubmissionDocument, Submission };
