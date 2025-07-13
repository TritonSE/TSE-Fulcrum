import { Router } from "express";

import { PipelineService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(() => {
    const pipelines = PipelineService.getAll();
    return {
      status: 200,
      json: pipelines,
    };
  }),
);

export default router;
