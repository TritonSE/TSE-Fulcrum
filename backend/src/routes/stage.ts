import { Router } from "express";

import { StageService } from "../services";

import { authWrapper } from "./wrappers";

import type { PipelineIdentifier } from "../config";

const router = Router();

router.get(
  "/",
  authWrapper((_user, req) => {
    const pipeline = req.query.pipeline;

    if (typeof pipeline === "string") {
      const result = StageService.getByPipeline(pipeline as PipelineIdentifier);
      return {
        status: 200,
        json: result,
      };
    }

    if (pipeline === undefined) {
      return {
        status: 200,
        json: StageService.getAll(),
      };
    }

    return {
      status: 400,
      text: "Invalid format for pipeline",
    };
  }),
);

router.get(
  "/:stageId",
  authWrapper((_user, req) => {
    const result = StageService.getById(Number.parseInt(req.params.stageId));
    if (result === null) {
      return { status: 404 };
    }
    return {
      status: 200,
      json: result,
    };
  }),
);

export default router;
