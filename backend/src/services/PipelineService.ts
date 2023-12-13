import { Types } from "mongoose";

import { PipelineDocument, PipelineModel, RawPipeline } from "../models";

class PipelineService {
  async create(pipeline: Omit<RawPipeline, "_id">): Promise<PipelineDocument | null> {
    // TODO: check for duplicate identifiers
    return PipelineModel.create(pipeline);
  }

  async update(pipeline: RawPipeline): Promise<PipelineDocument | null> {
    return PipelineModel.findOneAndReplace({ _id: pipeline._id }, pipeline, {
      returnDocument: "after",
    });
  }

  async getAll(): Promise<PipelineDocument[]> {
    return PipelineModel.find();
  }

  async getById(id: Types.ObjectId): Promise<PipelineDocument | null> {
    return PipelineModel.findById(id);
  }

  async getByIdentifier(identifier: string): Promise<PipelineDocument | null> {
    return PipelineModel.findOne({ identifier });
  }

  serialize(pipeline: PipelineDocument) {
    return {
      _id: pipeline._id.toHexString(),
      name: pipeline.name,
      identifier: pipeline.identifier,
    };
  }
}

export default new PipelineService();
