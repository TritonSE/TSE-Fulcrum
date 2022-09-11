import { HydratedDocument, model, Schema } from "mongoose";

interface User {
  email: string;
  name: string;

  passwordHash: string;

  passwordResetTokenHash: string;
  passwordResetExpiration: Date;
  
  sessionTokenHash: string;
  sessionExpiration: Date;
}

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
  }
});

export default model("User", UserSchema);
export type UserDocument = HydratedDocument<User>;
