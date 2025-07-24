import { HydratedDocument, Schema, Types, model } from "mongoose";

import { ObjectIdsToStrings } from "./helpers";

type Review = {
  _id: Types.ObjectId;
  stageId: number;
  application: Types.ObjectId;
  interview?: Types.ObjectId;
  reviewerEmail?: string;
  fields: Record<string, string | number | boolean>;
};

type RawReview = ObjectIdsToStrings<Review>;

const ReviewSchema = new Schema<Review>({
  stageId: {
    type: Number,
    required: true,
  },
  application: {
    type: Schema.Types.ObjectId,
    ref: "Application",
    required: true,
  },
  interview: {
    type: Schema.Types.ObjectId,
    ref: "Interview",
  },
  reviewerEmail: {
    type: String,
    index: true,
    // Not required, because reviews are created without an owner when they
    // are going to be manually assigned.
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

export { ReviewModel, ReviewDocument, Review, RawReview };
