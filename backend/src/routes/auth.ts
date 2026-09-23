import { Router } from "express";

import { LogInRequest } from "../cakes";
import env from "../env";
import { AuthService, UserService } from "../services";

import { authWrapper, wrapper } from "./wrappers";

const router = Router();

router.post(
  "/log-in",
  wrapper(async (req, res) => {
    const bodyResult = LogInRequest.check(req.body);
    if (!bodyResult.ok) {
      return {
        status: 400,
        text: bodyResult.error.toString(),
      };
    }

    const result = await UserService.logIn(bodyResult.value);

    if (result === null) {
      return { status: 401 };
    }

    res.cookie("session", result.sessionCookie, {
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
  }),
);

router.post(
  "/log-out",
  authWrapper(async (_user, req, res) => {
    const cookie: unknown = req.cookies.session;
    if (typeof cookie === "string") {
      const decoded = await AuthService.verifySessionCookie(cookie);
      if (decoded !== null) {
        await AuthService.revokeSessionCookie(decoded.uid);
      }
    }

    res.clearCookie("session", { path: "/api" });
    return { status: 200 };
  }),
);

router.get(
  "/me",
  authWrapper(async (user) =>
    Promise.resolve({
      status: 200,
      json: UserService.serialize(user),
    }),
  ),
);

export default router;
