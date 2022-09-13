import { Submission, SubmissionDocument, SubmissionModel } from "../models";
import FormService from "./FormService";

class SubmissionService {
  async create(submission: Submission): Promise<SubmissionDocument | string> {
    const formIdentifier = submission.formIdentifier;

    const form = await FormService.getByIdentifier(formIdentifier);
    if (form === null) {
      return `No form with identifier: ${formIdentifier}`;
    }

    for (const [key, value] of Object.entries(submission.fields)) {
      if (key in form.fields) {
        const field = form.fields[key];

        const valueType = typeof value;
        if (valueType !== field.type) {
          return `Wrong type for field ${key}: expected ${field.type}, got ${valueType}`;
        }

        if (!field.allowOther && !field.choices.includes(value)) {
          return `Invalid choice for field ${key}: expected one of ${field.choices}, got ${value}`;
        }
      } else {
        return `Unrecognized field: ${key}`;
      }
    }

    for (const key of Object.keys(form.fields)) {
      if (!(key in submission.fields)) {
        return `Missing field: ${key}`;
      }
    }

    return new SubmissionModel(submission).save();
  }

  serialize(submission: SubmissionDocument) {
    return {
      id: submission._id.toHexString(),
      formIdentifier: submission.formIdentifier,
      fields: submission.fields,
      draft: submission.draft,
      ownerEmail: submission.ownerEmail,
      applicationId: submission.application.toHexString(),
    };
  }
}

export default new SubmissionService();
