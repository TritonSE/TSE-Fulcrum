import { Router } from "express";

import { ReviewService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/:reviewId",
  authWrapper(async (_user, req) => {
    const result = await ReviewService.getById(req.params.reviewId);
    if (result === null) {
      return { status: 404 };
    }
    return {
      status: 200,
      json: ReviewService.serialize(result),
    };
  })
);

router.put(
  "/:reviewId",
  authWrapper(async (_user, req) => {
    const result = await ReviewService.update(req.body);
    if (typeof result === "string") {
      return { status: 400, text: result };
    }
    return { status: 200, json: ReviewService.serialize(result) };
  })
);

export default router;
