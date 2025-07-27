import { HydratedDocument, Schema, model } from "mongoose";

type User = {
  email: string;
  name: string;

  passwordHash: string;

  passwordResetTokenHash: string;
  passwordResetExpiration: Date;

  // TODO: move these to a separate model so a user can have multiple sessions
  sessionTokenHash: string;
  sessionExpiration: Date;

  // Used for automatic review assignment
  onlyFirstYearPhoneScreen: boolean;
  onlyFirstYearTechnical: boolean;
  isDoingInterviewAlone: boolean;

  assignedStageIds: number[];

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

  passwordHash: {
    type: String,
    required: true,
  },

  passwordResetTokenHash: {
    type: String,
    required: true,
  },
  passwordResetExpiration: {
    type: Date,
    required: true,
  },

  sessionTokenHash: {
    type: String,
    // We authenticate requests by looking up the user for the provided session token.
    // Session tokens are randomly generated, and their hashes are very unlikely to collide.
    unique: true,
    required: true,
  },
  sessionExpiration: {
    type: Date,
    required: true,
  },
  onlyFirstYearPhoneScreen: {
    type: Boolean,
    required: true,
  },
  onlyFirstYearTechnical: {
    type: Boolean,
    required: true,
  },
  isDoingInterviewAlone: {
    type: Boolean,
    required: true,
  },
  assignedStageIds: {
    type: [Number],
    required: true,
    default: [],
  },
});

const UserModel = model("User", UserSchema);
type UserDocument = HydratedDocument<User>;

export { UserModel, UserDocument };
