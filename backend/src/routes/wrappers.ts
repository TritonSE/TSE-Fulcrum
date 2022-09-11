import { Request, Response, RequestHandler } from "express";
import { UserDocument } from "../models/UserModel";
import UserService from "../services/UserService";

interface AsyncHandlerResult {
  status: number,
  json?: unknown,
}

type AsyncHandler = (req: Request, res: Response) => Promise<AsyncHandlerResult>;

function wrapper(handler: AsyncHandler): RequestHandler {
  return (req, res) => {
    handler(req, res).then(({ status, json }) => {
      res.status(status);

      if (json !== undefined) {
        res.json(json);
      } else {
        res.send();
      }
    }).catch((e) => {
      console.error(e);
      res.status(500).send();
    })
  };
}

type AsyncAuthHandler = (user: UserDocument, req: Request, res: Response) => Promise<AsyncHandlerResult>;

function authWrapper(handler: AsyncAuthHandler): RequestHandler {
  return wrapper(async (req, res) => {
    const sessionToken = req.cookies.session;
    if (sessionToken === undefined) {
      console.log("No session token provided");
      return { status: 401 };
    }

    const user = await UserService.getBySessionToken(sessionToken);
    if (user === null) {
      return { status: 401 };
    }

    return handler(user, req, res);
  })
}

export {
  wrapper,
  authWrapper,
}
