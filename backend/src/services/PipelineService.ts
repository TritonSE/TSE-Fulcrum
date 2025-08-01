import { Pipeline, pipelines } from "../config";

class PipelineService {
  getAll(): Pipeline[] {
    return pipelines;
  }

  getByIdentifier(identifier: string): Pipeline | null {
    return pipelines.find((pipeline) => pipeline.identifier === identifier) ?? null;
  }
}

export default new PipelineService();
