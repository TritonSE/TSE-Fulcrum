import { Router } from "express";

import { UserService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async () => {
    const users = await UserService.getAll();
    return {
      status: 200,
      json: users.map((u) => UserService.serialize(u)),
    };
  }),
);

export default router;
