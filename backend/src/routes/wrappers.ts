import { AuthService, UserService } from "../services";

import type { UserDocument } from "../models/UserModel";
import type { Request, RequestHandler, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

type AsyncHandlerResult = {
  status: number;
  json?: unknown;
  text?: string;
};

type AsyncHandler = (req: Request, res: Response) => Promise<AsyncHandlerResult>;

function wrapper(handler: AsyncHandler): RequestHandler {
  return (req, res) => {
    handler(req, res)
      .then(({ status, json, text }) => {
        res.status(status);

        if (json !== undefined) {
          res.json(json);
        } else if (text !== undefined) {
          res.send(text);
        } else {
          res.send();
        }
      })
      .catch((e) => {
        console.error(e);
        res.status(500).send();
      });
  };
}

async function getUser(req: Request): Promise<UserDocument | null> {
  const cookies: unknown = req.cookies;
  if (!(
    typeof cookies === "object" &&
    cookies !== null &&
    "session" in cookies &&
    typeof cookies.session === "string"
  )) {
    console.info("No session token provided");
    return null;
  }

  const decoded: DecodedIdToken | null = await AuthService.verifySessionCookie(cookies.session);
  if (decoded === null || !decoded.email_verified || !decoded.email) {
    console.info("Invalid session token provided");
    return null;
  }

  return UserService.getByEmail(decoded.email);
}

type AsyncAuthHandler = (
  user: UserDocument,
  req: Request,
  res: Response,
) => Promise<AsyncHandlerResult> | AsyncHandlerResult;

function authWrapper(handler: AsyncAuthHandler): RequestHandler {
  return wrapper(async (req, res) => {
    const user = await getUser(req);
    if (user === null) {
      return { status: 401 };
    }

    return handler(user, req, res);
  });
}

// A wrapper to use around routes that require the user to be an admin
function adminRequiredWrapper(handler: AsyncAuthHandler): RequestHandler {
  return authWrapper(async (user, req, res) => {
    if (!user.isAdmin) {
      return { status: 403, text: "You must be an admin to perform this action" };
    }
    return handler(user, req, res);
  });
}

export { adminRequiredWrapper, authWrapper, getUser, wrapper };
