import { Stage, stages } from "../config";

class StageService {
  getById(id: number): Stage | null {
    return stages.find((stage) => stage.id === id) ?? null;
  }

  getByPipeline(pipelineIdentifier: string): Stage[] {
    return stages
      .filter((stage) => stage.pipelineIdentifier === pipelineIdentifier)
      .sort((a, b) => a.pipelineIndex - b.pipelineIndex);
  }

  getByPipelineAndIndex(pipelineIdentifier: string, pipelineIndex: number): Stage | null {
    return (
      stages.find(
        (stage) =>
          stage.pipelineIdentifier === pipelineIdentifier && stage.pipelineIndex === pipelineIndex,
      ) ?? null
    );
  }

  getAll(): Stage[] {
    return stages;
  }
}

export default new StageService();
