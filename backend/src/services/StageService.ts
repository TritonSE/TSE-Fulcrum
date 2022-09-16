import { Types } from "mongoose";

import { StageDocument, StageModel } from "../models";

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

  async getById(id: Types.ObjectId): Promise<StageDocument | null> {
    return StageModel.findById(id);
  }

  // TODO: update stages - don't allow index to be changed

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
}

export default new StageService();
