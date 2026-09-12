import { model, Schema } from "mongoose";

import type { HydratedDocument } from "mongoose";
import type { StageIdentifier } from "src/config";

type User = {
  email: string;
  name: string;

  // Used for automatic review assignment
  onlyFirstYearPhoneScreen: boolean;
  onlyFirstYearTechnical: boolean;
  isDoingInterviewAlone: boolean;

  assignedStageIds: number[];

  // Optionally set maximum number of reviews on certain stages. This way,
  // volunteers/alumni can help with recruitment but with a lower time commitment
  // For technical interviews, this field's value is the TOTAL number of interviews
  // this reviewer would do among them and their interview buddy (if any); we don't
  // actually store interview buddies in the database, so we would just give them half
  // this many reviews (e.g. if their max is 4 and they're not interviewing alone, give them 2)
  maxReviewsPerStageIdentifier: Map<StageIdentifier, number>;

  isAdmin: boolean;

  // TODO: add boolean for whether a user is active, and ensure that admin account is always active
};

const UserSchema = new Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
  },

  name: {
    type: String,
    required: true,
  },
  onlyFirstYearPhoneScreen: {
    type: Boolean,
    required: true,
    default: false,
  },
  onlyFirstYearTechnical: {
    type: Boolean,
    required: true,
    default: false,
  },
  isDoingInterviewAlone: {
    type: Boolean,
    required: true,
    default: false,
  },
  assignedStageIds: {
    type: [Number],
    required: true,
    default: [],
  },
  maxReviewsPerStageIdentifier: {
    type: Map,
    required: true,
    default: {},
  },

  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const UserModel = model("User", UserSchema);
type UserDocument = HydratedDocument<User>;

export { UserDocument, UserModel };
