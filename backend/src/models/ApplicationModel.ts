import { HydratedDocument, Schema, model } from "mongoose";

type Application = {
  name: string;
  pronouns: string;
  email: string;
  phone: string;

  // Calendar year, e.g. 2022.
  yearApplied: number;

  // 4 * year + quarter - 8088 is winter 2022, 8089 is spring 2022, etc.
  // This makes it easy to sort chronologically.
  startQuarter: number;
  gradQuarter: number;

  major: string;
  majorDept: string;
  hearAboutTSE: string[];
  prevTest: string;

  resumeUrl: string;

  aboutPrompt: string;
  interestPrompt: string;

  // Automatically filled in as N/A for non-TEST applicants
  testBarriersPrompt: string;

  // Map role identifiers to the corresponding prompts.
  rolePrompts: Map<string, string>;

  blockListedReviewerEmails: string[];
};

const ApplicationSchema = new Schema<Application>({
  name: {
    type: String,
    required: true,
  },
  pronouns: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  yearApplied: {
    type: Number,
    required: true,
  },
  startQuarter: {
    type: Number,
    required: true,
  },
  gradQuarter: {
    type: Number,
    required: true,
  },
  major: {
    type: String,
    required: true,
  },
  majorDept: {
    type: String,
    required: true,
  },
  hearAboutTSE: {
    type: [String],
    required: true,
  },
  prevTest: {
    type: String,
    required: true,
  },
  resumeUrl: {
    type: String,
    required: true,
  },
  aboutPrompt: {
    type: String,
    required: true,
  },
  interestPrompt: {
    type: String,
    required: true,
  },
  testBarriersPrompt: {
    type: String,
    required: true,
  },
  rolePrompts: {
    type: Map,
    of: String,
    required: true,
  },
  blockListedReviewerEmails: {
    type: [String],
    required: true,
    default: [],
  },
});

const ApplicationModel = model("Application", ApplicationSchema);
type ApplicationDocument = HydratedDocument<Application>;

export { Application, ApplicationModel, ApplicationDocument };
