import mongoose, { Schema, model } from "mongoose";
import { hashPassword, verifyPassword } from "../crypto/password";

// Delete sensitive fields that should not be sent to the frontend.
function removeSensitiveFields(doc: mongoose.Document<User>, ret: Partial<User>) {
  delete ret.passwordKey;
  delete ret.passwordSalt;
  delete ret.hashedPasswordResetToken;
  delete ret.passwordResetExpiration;
  delete ret.hashedSessionToken;
  delete ret.sessionExpiration;
}

export interface User {
  email: string;
  passwordKey: string;
  passwordSalt: string;
  hashedPasswordResetToken: string;
  passwordResetExpiration: Date;
  hashedSessionToken: string;
  sessionExpiration: Date;
  active: boolean;
  admin: boolean;
  name: string;
}

const UserSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },

    // Hashed password and random salt.
    passwordKey: {
      type: String,
      required: true,
    },
    passwordSalt: {
      type: String,
      required: true,
    },

    // Password reset token and expiration date.
    hashedPasswordResetToken: {
      type: String,
      required: true,
    },
    passwordResetExpiration: {
      type: Date,
      required: true,
    },

    // Session token and expiration date.
    hashedSessionToken: {
      type: String,
      required: true,
      // Session tokens (hashed or not) are extremely unlikely to collide.
      unique: true,
    },
    sessionExpiration: {
      type: Date,
      required: true,
    },

    // Whether the user is active. Inactive users cannot log in.
    active: {
      type: Boolean,
      required: true,
    },

    // Whether the user has admin privileges.
    admin: {
      type: Boolean,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform: removeSensitiveFields,
    },
    toObject: {
      transform: removeSensitiveFields,
    },
  }
);

export default model("User", UserSchema);
