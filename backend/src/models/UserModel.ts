import { HydratedDocument, Schema, model } from "mongoose";

import CryptoService from "../services/CryptoService";

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

  // Generate random passwords and tokens, hash them, and throw away the
  // original values. This prevents anyone from logging into this account
  // until the user resets their password, which also serves as email
  // verification.
  // Alternatively, we could make the hash fields optional, but that would
  // require extra checks everywhere else.

  passwordHash: {
    type: String,
    required: true,
    default: function () {
      return CryptoService.hashPassword(CryptoService.generatePassword());
    },
  },

  passwordResetTokenHash: {
    type: String,
    required: true,
    default: function () {
      return CryptoService.hashToken(CryptoService.generateToken());
    },
  },
  passwordResetExpiration: {
    type: Date,
    required: true,
    default: function () {
      return new Date(0);
    },
  },

  sessionTokenHash: {
    type: String,
    // We authenticate requests by looking up the user for the provided session token.
    // Session tokens are randomly generated, and their hashes are very unlikely to collide.
    unique: true,
    required: true,
    default: function () {
      return CryptoService.hashToken(CryptoService.generateToken());
    },
  },
  sessionExpiration: {
    type: Date,
    required: true,
    default: function () {
      return new Date(0);
    },
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
});

const UserModel = model("User", UserSchema);
type UserDocument = HydratedDocument<User>;

export { UserModel, UserDocument };
