import { Types } from "mongoose";

import { StageDocument, StageModel } from "../models";

class StageService {
  async getById(id: Types.ObjectId): Promise<StageDocument | null> {
    return StageModel.findById(id);
  }

  // TODO: update stages - don't allow index to be changed

  async getByPipelineAndIndex(
    pipeline: Types.ObjectId,
    index: number
  ): Promise<StageDocument | null> {
    const stages = await StageModel.find({ pipeline, index });
    if (stages.length === 0) {
      return null;
    }
    if (stages.length === 1) {
      return stages[0];
    }
    throw new Error(
      `Internal invariant violated: pipeline ${pipeline.toHexString()} has ${
        stages.length
      } stages with index ${index}, expected 1`
    );
  }
}

export default new StageService();
