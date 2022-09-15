import { Router } from "express";

import application from "./application";
import auth from "./auth";
import pipeline from "./pipeline";
import user from "./user";

const router = Router();

router.use("/application", application);
router.use("/auth", auth);
router.use("/pipeline", pipeline);
router.use("/user", user);

export default router;
