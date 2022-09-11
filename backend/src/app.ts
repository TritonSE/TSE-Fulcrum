import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import { logIn, resetPassword, sendPasswordResetEmail, ensureAdminExists, getUserBySessionToken, userToJSON } from "./services/users";

import env from "./env";
import { api, asReqLogin } from "shared";
import { NarrowInput, UnknownTransformSpec } from "typesafer";

/*
function asyncRouteWrapper(app: Express.Application) {
  return (method: keyof Express.Application, ...args) => {
    app[method]
  };
}
*/

interface AsyncHandlerResult {
  status?: number,
  json?: any,
}

function asyncWrapper<A extends Request, B extends Response, C extends NextFunction>(asyncHandler: ((req: A, res: B, next: C) => Promise<AsyncHandlerResult>)): (req: A, res: B, next: C) => void {
  return (req, res, next) => {
    asyncHandler(req, res, next)
      .then(({ status, json }) => {
        if (status) {
          res.status(status);
        }
        if (json) {
          res.json(json);
        }
        res.send();
      })
      .catch((e) => {
        console.error(e);
        res.status(500).send();
      });
  }
}

async function main() {
  await mongoose.connect(env.MONGODB_URL);
  await ensureAdminExists(env.ORIGINAL_ADMIN_EMAIL);

  const app = express();

  app.use(morgan("combined"));
  app.use(bodyParser.json());
  app.use(cookieParser());

  type RouteOutput<R extends typeof api[keyof typeof api]> = (R["res"] extends UnknownTransformSpec ? {
    status: 200,
    body: NarrowInput<R["res"]>,
  } : {
    status: 200,
  }) | {
    status: 401,
  };

  type test = RouteOutput<typeof api["authLogin"]>;

  type Routes = {
    [K in keyof typeof api]: (req: any, res: any, body: any) => Promise<any>;
  }

  const routes: Routes = {
    authLogin: async (req, res) => {
      const login = asReqLogin(req.body);
      const [sessionToken, user] = await logIn(login);
      if (sessionToken === null) {
        return { status: 401 };
      }

      res.cookie("session", sessionToken, {
        secure: env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "strict",
        maxAge: env.SESSION_EXPIRATION_MS,
        path: "/api",
      });
      return {
        status: 200,
        json: userToJSON(user),
      };
    }
  }

  app.post("/api/auth/login", asyncWrapper(async (req, res) => {
    const login = asReqLogin(req.body);
    const [sessionToken, user] = await logIn(login);
    if (sessionToken === null) {
      return { status: 401 };
    }

    res.cookie("session", sessionToken, {
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
      maxAge: env.SESSION_EXPIRATION_MS,
      path: "/api",
    });
    return {
      status: 200,
      json: userToJSON(user),
    };
  }));

  app.get("/api/auth/me", asyncWrapper(async (req, res) => {
    const sessionToken = req.cookies.session;
    if (sessionToken !== undefined) {
      const user = await getUserBySessionToken(sessionToken);
      if (user !== null) {
        return {
          status: 200,
          json: userToJSON(user),
        }
      }
    }
    return { status: 401 };
  }));

  app.post("/api/auth/request-password-reset", asyncWrapper(async (req, res) => {
    await sendPasswordResetEmail(req.body.email);
    return { status: 200 };
  }))

  app.post("/api/auth/reset-password", asyncWrapper(async (req, res) => {
    if (await resetPassword(req.body)) {
      return { status: 200 };
    }
    return { status: 401 };
  }));

  app.listen(env.PORT, () => {
    console.log(`Listening on port ${env.PORT}`);
  })
}

main();
