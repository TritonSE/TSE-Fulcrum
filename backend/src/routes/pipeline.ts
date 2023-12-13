import { Router } from "express";

import { PipelineService, StageService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async () => {
    const pipelines = await PipelineService.getAll();
    return {
      status: 200,
      json: pipelines.map(PipelineService.serialize),
    };
  }),
);

router.post(
  "/",
  authWrapper(async (_user, req) => {
    const { name, identifier } = req.body;

    const pipeline = await PipelineService.create({ name, identifier });
    if (pipeline === null) {
      // TODO: improve this
      return {
        status: 400,
        text: "Could not create pipeline",
      };
    }

    const { stages } = req.body;
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
    const pipeline = await PipelineService.update(req.body);
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
