import { Router } from "express";

import { ReviewService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async (_user, req) => {
    const result = await ReviewService.getFiltered(
      Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, "" + v]))
    );
    return {
      status: 200,
      json: result.map(ReviewService.serialize),
    };
  })
);

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

// TODO: consolidate auto-assign and assign into one endpoint

router.post(
  "/:reviewId/auto-assign",
  authWrapper(async (_user, req) => {
    const result = await ReviewService.assign(req.params.reviewId, null);
    if (typeof result === "string") {
      return { status: 400, text: result };
    }
    return { status: 200, json: ReviewService.serialize(result) };
  })
);

router.post(
  "/:reviewId/assign/:reviewerEmail",
  authWrapper(async (_user, req) => {
    const result = await ReviewService.assign(req.params.reviewId, req.params.reviewerEmail);
    if (typeof result === "string") {
      return { status: 400, text: result };
    }
    return { status: 200, json: ReviewService.serialize(result) };
  })
);

export default router;
