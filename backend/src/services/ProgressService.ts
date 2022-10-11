import { Types } from "mongoose";

import { ApplicationModel, ProgressDocument, ProgressModel } from "../models";

import EmailService from "./EmailService";
import PipelineService from "./PipelineService";
import ReviewService from "./ReviewService";
import StageService from "./StageService";

class ProgressService {
  async create(pipeline: Types.ObjectId, application: Types.ObjectId): Promise<ProgressDocument> {
    const progress = await new ProgressModel({
      pipeline,
      application,
      stageIndex: -1, // Temporary value - will be incremented by advanceApplication
      state: "pending",
    }).save();

    await this.advanceApplication(application, pipeline);

    return progress;
  }

  async getByPipelineAndApplication(
    pipeline: Types.ObjectId,
    application: Types.ObjectId
  ): Promise<ProgressDocument | null> {
    return ProgressModel.findOne({ pipeline, application });
  }

  async advanceApplication(
    application: Types.ObjectId,
    pipeline: Types.ObjectId
  ): Promise<ProgressDocument | string> {
    const progress = await this.getByPipelineAndApplication(pipeline, application);
    if (progress === null) {
      return `No progress indicator exists for pipeline ${pipeline.toHexString()} and application ${application.toHexString()}`;
    }

    const currentStage = await StageService.getByPipelineAndIndex(pipeline, progress.stageIndex);
    if (currentStage !== null) {
      const reviews = await ReviewService.getByStageAndApplication(currentStage._id, application);
      if (reviews.some((review) => !review.completed)) {
        return `Not all reviews for the preceding stage (${progress.stageIndex}) are complete`;
      }
    }

    const nextIndex = progress.stageIndex + 1;
    const nextStage = await StageService.getByPipelineAndIndex(pipeline, nextIndex);
    if (nextStage === null) {
      console.info(
        `No more stages; changing progress indicator state to accepted: ${progress._id.toHexString()}`
      );
      progress.state = "accepted";
      await progress.save();

      // TODO: using ApplicationService creates a dependency cycle
      const applicationDocument = await ApplicationModel.findById(application);
      if (applicationDocument === null) {
        return `Application not found: ${application.toHexString()}`;
      }

      const pipelineDocument = await PipelineService.getById(pipeline);
      if (pipelineDocument === null) {
        return `Pipeline not found: ${pipeline.toHexString}`;
      }

      await EmailService.send({
        recipient: applicationDocument.email,
        subject: "Welcome to Triton Software Engineering!",
        body: [
          `Dear ${applicationDocument.name},`,
          `We were impressed with your qualifications and interview performance, and we would like to invite you to join Triton Software Engineering as a ${pipelineDocument.name}! We will follow up with you shortly to share more details.`,
        ].join("\n\n"),
      });

      return progress;
    }

    console.info(`Advancing to stage ${nextIndex}: ${progress._id.toHexString()}`);
    progress.stageIndex = nextIndex;

    // Create reviews for the new stage.
    // We have to do this sequentially to avoid race conditions when
    // auto-assigning reviewers (e.g. assigning both reviews to the same
    // reviewer).
    for (let i = 0; i < nextStage.numReviews; i++) {
      // eslint-disable-next-line no-await-in-loop
      await ReviewService.create(nextStage, application);
    }

    return progress.save();
  }

  async rejectApplication(
    application: Types.ObjectId,
    pipeline: Types.ObjectId
  ): Promise<ProgressDocument | string> {
    const progress = await this.getByPipelineAndApplication(pipeline, application);
    if (progress === null) {
      return `No progress indicator exists for pipeline ${pipeline.toHexString()} and application ${application.toHexString()}`;
    }

    progress.state = "rejected";
    await progress.save();

    // TODO: using ApplicationService creates a dependency cycle
    const applicationDocument = await ApplicationModel.findById(application);
    if (applicationDocument === null) {
      return `Application not found: ${application.toHexString()}`;
    }

    const pipelineDocument = await PipelineService.getById(pipeline);
    if (pipelineDocument === null) {
      return `Pipeline not found: ${pipeline.toHexString}`;
    }

    await EmailService.send({
      recipient: applicationDocument.email,
      subject: "Triton Software Engineering Application Update",
      body: [
        `Dear ${applicationDocument.name},`,
        `Thank you for applying to the ${pipelineDocument.name} position at Triton Software Engineering. Unfortunately, our application process is very competitive, and we are not able to move forward with your application at this time. If you applied for other roles at TSE, you will receive updates about those separately.`,
        "You are welcome to reapply in the future, and we wish you the best in your academic and professional endeavors.",
      ].join("\n\n"),
    });

    return progress;
  }
}

export default new ProgressService();
