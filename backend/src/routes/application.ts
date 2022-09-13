import { Router } from "express";
import { ApplicationService } from "../services";

import { wrapper } from "./wrappers";

const router = Router();

router.post(
  "/",
  wrapper(async (req) => {
    // Note: this gets the current year in local time, but we close applications
    // long before January 1st, so this shouldn't ever make a difference.
    const yearApplied = new Date().getFullYear();

    const result = await ApplicationService.create({ ...req.body, yearApplied });

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
