import { Types } from "mongoose";

import { Pipeline } from "../config";
import { Application, ApplicationDocument, ApplicationModel } from "../models";

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
      return `You have already submitted an application in ${yearApplied}.`;
    }

    const pipelines: Pipeline[] = [];
    for (const identifier of Object.keys(application.rolePrompts)) {
      const pipeline = PipelineService.getByIdentifier(identifier);
      if (pipeline === null) {
        return `Role not found: ${identifier}`;
      }
      pipelines.push(pipeline);
    }

    const result = await ApplicationModel.create(application);

    // Create application progress indicators for each role.
    await Promise.all(
      pipelines.map((pipeline) => ProgressService.create(pipeline.identifier, result._id)),
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

  async getById(id: string | Types.ObjectId): Promise<ApplicationDocument | null> {
    return ApplicationModel.findById(id);
  }

  /* 1 - First year, 2 - Second year... */
  public determineApplicantGradeLevel(startQuarter: number, gradQuarter: number): number {
    const totalQuartersAtUCSD = this.calculateQuarterDiff(startQuarter, gradQuarter);

    const now = new Date();

    // If it's currently summer, year level is rounded up to next fall
    // Shouldn't be relevant since we only receive applications in the fall
    const yearsSinceStart = Math.ceil(
      this.calculateQuarterDiff(
        startQuarter,
        now.getFullYear() * 4 + Math.floor(now.getMonth() / 3),
      ) / 3,
    );

    return totalQuartersAtUCSD < 9 ? yearsSinceStart + 2 : yearsSinceStart;
  }

  /* Helper function to calculate academic quarters between two encoded quarter values */
  private calculateQuarterDiff(startQuarter: number, endQuarter: number): number {
    if (endQuarter < startQuarter) return 0;
    const yearsBetween = Math.floor(endQuarter / 4) - Math.floor(startQuarter / 4);
    return endQuarter - startQuarter - yearsBetween + 1;
  }

  serialize(application: ApplicationDocument) {
    return {
      ...application.toJSON(),
      applicantYear: this.determineApplicantGradeLevel(
        application.startQuarter,
        application.gradQuarter,
      ),
    };
  }
}

export default new ApplicationService();
