import { HydratedDocument, model, Schema, Types } from "mongoose";

interface Review {
  stage: Types.ObjectId;
  application: Types.ObjectId;
  reviewerEmail?: string;
  completed: boolean;
  fields: Record<string, string | number | boolean>;
}

const ReviewSchema = new Schema<Review>({
  stage: {
    type: Schema.Types.ObjectId,
    ref: "Stage",
    required: true,
  },
  application: {
    type: Schema.Types.ObjectId,
    ref: "Application",
    required: true,
  },
  reviewerEmail: {
    type: String,
    index: true,
    // Not required, because reviews are created without an owner when they
    // are going to be manually assigned.
  },
  completed: {
    type: Boolean,
    required: true,
  },
  fields: {
    type: Map,
    required: true,
  },
});

// Used to find reviews by stage and application.
ReviewSchema.index({ stage: 1, application: 1 });

// Used to determine if a reviewer has seen an application before.
ReviewSchema.index({ reviewerEmail: 1, application: 1 });

const ReviewModel = model("Review", ReviewSchema);
type ReviewDocument = HydratedDocument<Review>;

export { ReviewModel, ReviewDocument, Review };
