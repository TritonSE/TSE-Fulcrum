import { boolean, compile, NarrowInput, string, UnknownTransformSpec } from "typesafer";

const ReqRequestPasswordReset = {
  email: string,
}

type ReqRequestPasswordReset = NarrowInput<typeof ReqRequestPasswordReset>;
const asReqRequestPasswordReset = compile(ReqRequestPasswordReset);

const ReqResetPassword = {
  email: string,
  password: string,
  passwordResetToken: string,
}

type ReqResetPassword = NarrowInput<typeof ReqResetPassword>;
const asReqResetPassword = compile(ReqResetPassword);

const ReqLogin = {
  email: string,
  password: string,
}

type ReqLogin = NarrowInput<typeof ReqLogin>;
const asReqLogin = compile(ReqLogin);

const ReqUserCreate = {
  email: string,
  active: boolean,
  admin: boolean,
  name: string,
}

type ReqUserCreate = NarrowInput<typeof ReqUserCreate>;
const asReqUserCreate = compile(ReqUserCreate);

const PublicUser = {
  id: string,
  ...ReqUserCreate,
}

type PublicUser = NarrowInput<typeof PublicUser>;
const asPublicUser = compile(PublicUser);

type Route = {
  method: "get" | "post";
  base: string;
  req: UnknownTransformSpec | undefined;
  res: UnknownTransformSpec | undefined;
}

const api = {
  authLogin: {
    method: "post",
    base: "/api/auth/login",
    req: ReqLogin,
    res: PublicUser,
  },
  authRequestPasswordReset: {
    method: "post",
    base: "/api/auth/request-password-reset",
    req: ReqRequestPasswordReset,
    res: undefined,
  },
  authResetPassword: {
    method: "post",
    base: "/api/auth/reset-password",
    req: ReqResetPassword,
    res: undefined,
  },
  authMe: {
    method: "get",
    base: "/api/auth/me",
    req: undefined,
    res: PublicUser,
  },
} as const;

const _typecheck: {[K: string]: Route} = api;

export {
  api,
  PublicUser,
  asPublicUser,
  ReqLogin,
  asReqLogin,
  ReqRequestPasswordReset,
  asReqRequestPasswordReset,
  ReqResetPassword,
  asReqResetPassword,
  ReqUserCreate,
  asReqUserCreate,
}
