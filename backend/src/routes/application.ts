import { Router } from "express";

import { ApplicationService } from "../services";

import { wrapper } from "./wrappers";

const router = Router();

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
