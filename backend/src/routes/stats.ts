import { Router } from "express";

import { StatsService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async (_user, req) => {
    const yearParam = req.query.year;
    const year = yearParam === undefined ? new Date().getFullYear() : Number(yearParam);
    if (!Number.isInteger(year)) {
      return { status: 400, text: `Invalid year: ${String(yearParam)}` };
    }

    return { status: 200, json: await StatsService.getStats(year) };
  }),
);

export default router;
