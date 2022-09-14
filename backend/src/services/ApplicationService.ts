import { Application, ApplicationModel } from "../models";

import EmailService from "./EmailService";

class ApplicationService {
  async create(application: Application): Promise<Application | string> {
    const { email, yearApplied } = application;

    // TODO: disallow applications from being submitted past the deadline

    const existingApplication = await ApplicationModel.findOne({ email, yearApplied });
    if (existingApplication !== null) {
      return `The email address ${email} was already used to submit an application in ${yearApplied}.`;
    }

    // TODO: check rolePrompts against active pipelines

    const result = await ApplicationModel.create(application);

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
}

export default new ApplicationService();
