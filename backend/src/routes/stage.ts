import { Router } from "express";

import { RawStage } from "../models";
import { StageService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async (_user, req) => {
    const pipeline = req.query.pipeline;

    if (typeof pipeline === "string") {
      const result = await StageService.getByPipeline(pipeline);
      const mapped = result.map((s) => StageService.serialize(s));
      return {
        status: 200,
        json: mapped,
      };
    }

    if (pipeline === undefined) {
      return {
        status: 200,
        json: (await StageService.getAll()).map((s) => StageService.serialize(s)),
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
  authWrapper(async (_user, req) => {
    const result = await StageService.getById(req.params.stageId);
    if (result === null) {
      return { status: 404 };
    }
    return {
      status: 200,
      json: StageService.serialize(result),
    };
  }),
);

router.put(
  "/:id",
  authWrapper(async (_user, req) => {
    const result = await StageService.update(req.body as RawStage);
    if (typeof result === "string") {
      return {
        status: 400,
        text: result,
      };
    }
    return {
      status: 200,
      json: StageService.serialize(result),
    };
  }),
);

export default router;
