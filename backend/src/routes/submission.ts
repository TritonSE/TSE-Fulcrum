import { Router } from "express";

import { SubmissionService } from "../services";

import { wrapper } from "./wrappers";

const router = Router();

router.post(
  "/:formIdentifier",
  wrapper(async (req) => {
    const result = await SubmissionService.create({
      ...req.body,
      formIdentifier: req.params.formIdentifier,
    });

    if (typeof result === "string") {
      return {
        status: 400,
        text: result,
      };
    }

    return {
      status: 201,
      json: SubmissionService.serialize(result),
    };
  })
);

export default router;
