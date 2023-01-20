import { Router } from "express";

import { CreateUserRequest } from "../cakes";
import { UserService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async () => {
    const users = await UserService.getAll();
    return {
      status: 200,
      json: users.map(UserService.serialize),
    };
  })
);

router.post(
  "/",
  authWrapper(async (_user, req) => {
    const bodyResult = CreateUserRequest.check(req.body);
    if (!bodyResult.ok) {
      return {
        status: 400,
        text: bodyResult.error.toString(),
      };
    }
    const user = await UserService.create(bodyResult.value);
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
  })
);

router.get(
  ":email",
  authWrapper(async (_user, req) => {
    const user = await UserService.getByEmail(req.params.email);
    if (user === null) {
      return {
        status: 404,
      };
    }

    return {
      status: 200,
      json: UserService.serialize(user),
    };
  })
);

export default router;
