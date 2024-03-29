import { Router } from "express";

import { LogInRequest, RequestPasswordResetRequest, ResetPasswordRequest } from "../cakes";
import env from "../env";
import { UserService } from "../services";

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
  }),
);

router.post(
  "/log-out",
  authWrapper(async (user) => {
    await UserService.logOut(user);
    return { status: 200 };
  }),
);

router.get(
  "/me",
  authWrapper((user) =>
    Promise.resolve({
      status: 200,
      json: UserService.serialize(user),
    }),
  ),
);

router.post(
  "/request-password-reset",
  wrapper(async (req) => {
    const bodyResult = RequestPasswordResetRequest.check(req.body);
    if (!bodyResult.ok) {
      return {
        status: 400,
        text: bodyResult.error.toString(),
      };
    }
    await UserService.requestPasswordReset(bodyResult.value.email);
    // We don't want to return an error if the email doesn't exist, because
    // that would enable unauthenticated clients to check whether an account
    // exists with a given email.
    return { status: 200 };
  }),
);

router.post(
  "/reset-password",
  wrapper(async (req) => {
    const bodyResult = ResetPasswordRequest.check(req.body);
    if (!bodyResult.ok) {
      return {
        status: 400,
        text: bodyResult.error.toString(),
      };
    }

    if (await UserService.resetPassword(bodyResult.value)) {
      return { status: 200 };
    }
    return { status: 400 };
  }),
);

export default router;
