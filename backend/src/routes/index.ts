import { Router } from "express";

import application from "./application";
import auth from "./auth";
import user from "./user";

const router = Router();

router.use("/application", application);
router.use("/auth", auth);
router.use("/user", user);

export default router;
