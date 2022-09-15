import { Types } from "mongoose";

import { Pipeline, PipelineDocument, PipelineModel } from "../models";

class PipelineService {
  async create(pipeline: Pipeline): Promise<PipelineDocument | null> {
    // TODO: check for duplicate identifiers
    return new PipelineModel(pipeline).save();
  }

  async getById(id: Types.ObjectId): Promise<PipelineDocument | null> {
    return PipelineModel.findById(id);
  }

  async getByIdentifier(identifier: string): Promise<PipelineDocument | null> {
    return PipelineModel.findOne({ identifier });
  }
}

export default new PipelineService();
