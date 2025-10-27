import mongoose from "mongoose";

import { ApplicationModel, ProgressModel } from "../models";

import EmailService from "./EmailService";
import PipelineService from "./PipelineService";
import ReviewService from "./ReviewService";
import StageService from "./StageService";

import type { PipelineIdentifier } from "../config";
import type { ProgressDocument } from "../models";
import type { Types } from "mongoose";

class ProgressService {
  async create(
    pipelineIdentifier: PipelineIdentifier,
    application: Types.ObjectId,
  ): Promise<ProgressDocument> {
    const progress = await new ProgressModel({
      pipelineIdentifier,
      application,
      stageIndex: -1, // Temporary value - will be incremented by advanceApplication
      state: "pending",
    }).save();

    await this.advanceApplication(application, pipelineIdentifier);

    return progress;
  }

  async getByPipelineAndApplication(
    pipelineIdentifier: PipelineIdentifier,
    application: Types.ObjectId,
  ): Promise<ProgressDocument | null> {
    return ProgressModel.findOne({ pipelineIdentifier, application });
  }

  async advanceApplication(
    application: Types.ObjectId,
    pipelineIdentifier: PipelineIdentifier,
  ): Promise<ProgressDocument | string> {
    const progress = await this.getByPipelineAndApplication(pipelineIdentifier, application);
    if (progress === null) {
      return `No progress indicator exists for pipeline ${pipelineIdentifier} and application ${application.toHexString()}`;
    }

    if (progress.state !== "pending") {
      return `Cannot advance; application is already ${progress.state}`;
    }

    const nextIndex = progress.stageIndex + 1;
    const nextStage = StageService.getByPipelineAndIndex(pipelineIdentifier, nextIndex);
    if (nextStage === null) {
      console.info(
        `No more stages; changing progress indicator state to accepted: ${progress._id.toHexString()}`,
      );
      progress.state = "accepted";
      await progress.save();

      /*
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
      */

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

  async bulkAdvanceApplications(applicationIds: string[], pipelineIdentifier: PipelineIdentifier) {
    const results = [];

    // Synchronously advance each application
    for (const applicationId of applicationIds) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.advanceApplication(
        new mongoose.Types.ObjectId(applicationId),
        pipelineIdentifier,
      );
      results.push({ applicationId, result });
    }

    return results;
  }

  async rejectApplication(
    application: Types.ObjectId,
    pipelineIdentifier: PipelineIdentifier,
  ): Promise<ProgressDocument | string> {
    const progress = await this.getByPipelineAndApplication(pipelineIdentifier, application);
    if (progress === null) {
      return `No progress indicator exists for pipeline ${pipelineIdentifier} and application ${application.toHexString()}`;
    }

    if (progress.state !== "pending") {
      return `Cannot reject; application is already ${progress.state}`;
    }

    // TODO: using ApplicationService creates a dependency cycle
    const applicationDocument = await ApplicationModel.findById(application);
    if (applicationDocument === null) {
      return `Application not found: ${application.toHexString()}`;
    }

    const pipelineDocument = PipelineService.getByIdentifier(pipelineIdentifier);
    if (pipelineDocument === null) {
      return `Pipeline not found: ${pipelineIdentifier}`;
    }

    const emailSuccessful = await EmailService.send({
      recipient: applicationDocument.email,
      subject: `Triton Software Engineering - ${pipelineDocument.name} Application Update`,
      body: [
        `Dear ${applicationDocument.name},`,
        `Thank you for your interest in Triton Software Engineering. Unfortunately, we cannot offer you a ${pipelineDocument.name} position in our organization at this time. If you applied for other roles at TSE, you will hear back separately for each role.`,
        `Our team was impressed by your skills and accomplishments, and we invite you to apply again next year as our organization grows and more spots open up.`,
        `We wish you the best for your future professional and collegiate endeavors.`,
        `Regards,`,
        `The TSE Team`,
      ].join("\n\n"),
    });
    if (!emailSuccessful) {
      return "Failed to send rejection email - please talk to VP Technology";
    }

    progress.state = "rejected";
    await progress.save();

    return progress;
  }

  async getFiltered(filter: Record<string, string>): Promise<ProgressDocument[]> {
    return ProgressModel.find(filter);
  }

  async getById(id: string): Promise<ProgressDocument | null> {
    return ProgressModel.findById(id);
  }

  serialize(progress: ProgressDocument) {
    return {
      _id: progress._id.toHexString(),
      pipelineIdentifier: progress.pipelineIdentifier,
      application: progress.application.toHexString(),
      stageIndex: progress.stageIndex,
      state: progress.state,
    };
  }
}

export default new ProgressService();
