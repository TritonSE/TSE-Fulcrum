import { Router } from "express";

import application from "./application";
import auth from "./auth";
import pipeline from "./pipeline";
import progress from "./progress";
import review from "./review";
import stage from "./stage";
import user from "./user";

const router = Router();

router.use("/application", application);
router.use("/auth", auth);
router.use("/pipeline", pipeline);
router.use("/progress", progress);
router.use("/review", review);
router.use("/stage", stage);
router.use("/user", user);

export default router;
