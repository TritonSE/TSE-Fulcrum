import { Schema, model } from "mongoose";

interface Email {
  recipient: string;
  subject: string;
  message: string;
  sendError: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSchema = new Schema<Email>({
  recipient: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sendError: {
    type: String,
    required: true,
  }
}, { timestamps: true });

export default model("Email", EmailSchema);
