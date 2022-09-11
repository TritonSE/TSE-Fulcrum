import { Router } from "express";

import { UserService } from "../services";
import { authWrapper } from "./wrappers";

const router = Router();

router.post("/", authWrapper(async (_user, req) => {
  const user = await UserService.create(req.body);
  if (user === null) {
    return {
      status: 409,
      text: "The provided email address is linked to an existing account",
    };
  }

  return {
    status: 201,
    json: UserService.serialize(user),
  };
}));

export default router;
