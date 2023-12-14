import { Router } from "express";

import { CreatePipelineRequest } from "../cakes";
import { RawPipeline } from "../models";
import { PipelineService, StageService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async () => {
    const pipelines = await PipelineService.getAll();
    return {
      status: 200,
      json: pipelines.map((p) => PipelineService.serialize(p)),
    };
  }),
);

router.post(
  "/",
  authWrapper(async (_user, req) => {
    const bodyResult = CreatePipelineRequest.check(req.body);
    if (!bodyResult.ok) {
      return {
        status: 400,
        text: bodyResult.error.toString(),
      };
    }

    const { name, identifier, stages } = bodyResult.value;

    const pipeline = await PipelineService.create({ name, identifier });
    if (pipeline === null) {
      // TODO: improve this
      return {
        status: 400,
        text: "Could not create pipeline",
      };
    }

    const nums = [];
    for (let i = 0; i < stages; i++) {
      nums.push(i);
    }
    await Promise.all(nums.map((i) => StageService.create(pipeline._id, i)));

    return {
      status: 201,
      json: PipelineService.serialize(pipeline),
    };
  }),
);

router.put(
  "/:id",
  authWrapper(async (_user, req) => {
    const pipeline = await PipelineService.update(req.body as RawPipeline);
    if (pipeline === null) {
      return { status: 404 };
    }
    return {
      status: 200,
      json: PipelineService.serialize(pipeline),
    };
  }),
);

export default router;
