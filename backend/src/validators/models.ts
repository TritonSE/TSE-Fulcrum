import { compile, NarrowestInput, Output, string } from "./validators";

const specLogin = {
  email: string,
  password: string,
};

const transformLogin = compile(specLogin);

type LoginInput = NarrowestInput<typeof specLogin>;
type Login = Output<typeof specLogin>;

export {
  transformLogin,
  Login
};
