import { Router } from "express";
import env from "../env";
import UserService from "../services/UserService";
import { wrapper, authWrapper } from "./wrappers";

const router = Router();

router.post("/log-in", wrapper(async (req, res) => {
  const result = await UserService.logIn(req.body);

  if (result === null) {
    return { status: 401 };
  }

  res.cookie("session", result.sessionToken, {
    secure: env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: env.SESSION_EXPIRATION_MINS * 60 * 1000,
    path: "/api",
  });

  return {
    status: 200,
    json: UserService.serialize(result.user),
  };
}));

router.post("/log-out", authWrapper(async (user) => {
  await UserService.logOut(user);
  return { status: 200 };
}));

router.get("/me", authWrapper(async (user) => {
  return {
    status: 200,
    json: UserService.serialize(user),
  };
}));

export default router;
