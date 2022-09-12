import { HydratedDocument, model, Schema, Types } from "mongoose";

interface Submission {
  formIdentifier: string;
  fields: Record<string, string | number | boolean>;
  ownerEmail: string | null;
  parent: Types.ObjectId | null;
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
  ownerEmail: {
    type: String,
    required: false,
  },
  parent: {
    type: Schema.Types.ObjectId,
    required: false,
  },
});

const SubmissionModel = model("Submission", SubmissionSchema);
type SubmissionDocument = HydratedDocument<Submission>;

export { SubmissionModel, SubmissionDocument, Submission };
