import { Types } from "mongoose";

import { Application, ApplicationDocument, ApplicationModel, PipelineDocument } from "../models";

import EmailService from "./EmailService";
import PipelineService from "./PipelineService";
import ProgressService from "./ProgressService";

class ApplicationService {
  async create(application: Application): Promise<Application | string> {
    // TODO: disallow applications from being submitted past the deadline

    // Note: this gets the current year in local time, but we close applications
    // long before January 1st, so this shouldn't ever make a difference.
    const yearApplied = new Date().getFullYear();
    application = { ...application, yearApplied };

    const { email } = application;
    const existingApplication = await ApplicationModel.findOne({ email, yearApplied });
    if (existingApplication !== null) {
      return `The email address ${email} was already used to submit an application in ${yearApplied}.`;
    }

    const pipelines: PipelineDocument[] = [];
    for (const identifier of Object.keys(application.rolePrompts)) {
      // TODO: refactor later, but not a huge performance concern since the
      // number of pipelines is small
      // eslint-disable-next-line no-await-in-loop
      const pipeline = await PipelineService.getByIdentifier(identifier);
      if (pipeline === null) {
        return `Role not found: ${identifier}`;
      }
      pipelines.push(pipeline);
    }

    const result = await ApplicationModel.create(application);

    // Create application progress indicators for each role.
    await Promise.all(
      pipelines.map((pipeline) => ProgressService.create(pipeline._id, result._id))
    );

    await EmailService.send({
      recipient: application.email,
      subject: `TSE Application Confirmation`,
      body: [
        `Dear ${application.name},`,
        "Thank you for your interest in Triton Software Engineering! This email confirms that we have received your application.",
      ].join("\n\n"),
    });

    return result;
  }

  async getById(id: Types.ObjectId): Promise<ApplicationDocument | null> {
    return ApplicationModel.findById(id);
  }
}

export default new ApplicationService();
