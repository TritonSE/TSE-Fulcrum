import { Router } from "express";

import { ProgressService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async (_user, req) => {
    const result = await ProgressService.getFiltered(
      Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, "" + v])),
    );
    return {
      status: 200,
      json: result.map(ProgressService.serialize),
    };
  }),
);

router.post(
  "/:progressId/advance",
  authWrapper(async (_user, req) => {
    const progress = await ProgressService.getById(req.params.progressId);
    if (progress === null) {
      return {
        status: 404,
      };
    }

    const result = await ProgressService.advanceApplication(
      progress.application,
      progress.pipeline,
    );
    if (typeof result === "string") {
      return {
        status: 400,
        text: result,
      };
    }
    return {
      status: 200,
      json: result,
    };
  }),
);

router.post(
  "/:progressId/reject",
  authWrapper(async (_user, req) => {
    const progress = await ProgressService.getById(req.params.progressId);
    if (progress === null) {
      return {
        status: 404,
      };
    }

    const result = await ProgressService.rejectApplication(progress.application, progress.pipeline);
    if (typeof result === "string") {
      return {
        status: 400,
        text: result,
      };
    }
    return {
      status: 200,
      json: result,
    };
  }),
);

export default router;
