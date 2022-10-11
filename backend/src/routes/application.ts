import { Router } from "express";

import { ApplicationService } from "../services";

import { authWrapper, wrapper } from "./wrappers";

const router = Router();

router.get(
  "/:applicationId",
  authWrapper(async (_user, req) => {
    const result = await ApplicationService.getById(req.params.applicationId);
    if (result === null) {
      return { status: 404 };
    }
    return {
      status: 200,
      json: ApplicationService.serialize(result),
    };
  })
);

router.delete(
  "/:applicationId",
  authWrapper(async (_user, req) => {
    const result = await ApplicationService.deleteById(req.params.applicationId);
    if (typeof result === "string") {
      return {
        status: 404,
        text: result,
      };
    }
    return {
      status: 200,
      json: ApplicationService.serialize(result),
    };
  })
);

router.post(
  "/",
  wrapper(async (req) => {
    const result = await ApplicationService.create(req.body);
    if (typeof result === "string") {
      return {
        status: 400,
        text: result,
      };
    }

    return {
      status: 201,
      json: result,
    };
  })
);

export default router;
