import { Types } from "mongoose";

import { Stage, StageDocument, StageModel, UserModel } from "../models";

class StageService {
  async create(pipeline: Types.ObjectId, pipelineIndex: number): Promise<StageDocument> {
    return StageModel.create({
      pipeline,
      pipelineIndex,
      numReviews: 1,
      name: `Stage ${pipelineIndex + 1}`,
      fields: {},
      fieldOrder: [],
      reviewerEmails: [],
      autoAssignReviewers: false,
      notifyReviewersWhenAssigned: true,
    });
  }

  async getById(id: Types.ObjectId | string): Promise<StageDocument | null> {
    return StageModel.findById(id);
  }

  async update(stage: Stage): Promise<StageDocument | string> {
    const existing = await StageModel.findById(stage._id);
    if (existing === null) {
      // TODO: find a way to indicate 404 here
      return `No stage with id: ${stage._id}`;
    }

    if (stage.pipelineIndex !== existing.pipelineIndex) {
      return `Cannot change pipelineIndex from ${existing.pipelineIndex} to ${stage.pipelineIndex}`;
    }

    // TODO: filter on active users once we add the ability to deactivate users
    const reviewers = await UserModel.find().where("email").in(stage.reviewerEmails).exec();
    const missingEmails = stage.reviewerEmails.filter(
      (email) => !reviewers.some((reviewer) => reviewer.email === email)
    );
    if (missingEmails.length > 0) {
      return `Email addresses not valid: ${missingEmails}`;
    }

    const updatedStage = await StageModel.findOneAndReplace({ _id: stage._id }, stage, {
      returnDocument: "after",
    });
    if (updatedStage === null) {
      return `Race condition: stage with id deleted? ${stage._id}`;
    }
    return updatedStage;
  }

  async getByPipeline(pipeline: Types.ObjectId | string): Promise<StageDocument[]> {
    return StageModel.find({ pipeline }).sort({ pipelineIndex: 1 });
  }

  async getByPipelineAndIndex(
    pipeline: Types.ObjectId,
    pipelineIndex: number
  ): Promise<StageDocument | null> {
    const stages = await StageModel.find({ pipeline, pipelineIndex });
    if (stages.length === 0) {
      return null;
    }
    if (stages.length === 1) {
      return stages[0];
    }
    throw new Error(
      `Internal invariant violated: pipeline ${pipeline.toHexString()} has ${
        stages.length
      } stages with index ${pipelineIndex}, expected 1`
    );
  }

  async getAll(): Promise<StageDocument[]> {
    return StageModel.find();
  }

  serialize(stage: StageDocument) {
    return {
      _id: stage._id.toHexString(),
      pipeline: stage.pipeline.toHexString(),
      pipelineIndex: stage.pipelineIndex,
      numReviews: stage.numReviews,
      name: stage.name,
      fields: stage.fields,
      fieldOrder: stage.fieldOrder,
      reviewerEmails: stage.reviewerEmails,
      autoAssignReviewers: stage.autoAssignReviewers,
      notifyReviewersWhenAssigned: stage.notifyReviewersWhenAssigned,
    };
  }
}

export default new StageService();
