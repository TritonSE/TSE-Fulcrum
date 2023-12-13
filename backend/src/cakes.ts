import { Infer, bake, string } from "caketype";

const LogInRequest = bake({
  email: string,
  password: string,
} as const);

type LogInRequest = Infer<typeof LogInRequest>;

const CreateUserRequest = bake({
  email: string,
  name: string,
});

type CreateUserRequest = Infer<typeof CreateUserRequest>;

const ResetPasswordRequest = bake({
  email: string,
  passwordResetToken: string,
  password: string,
});

type ResetPasswordRequest = Infer<typeof ResetPasswordRequest>;

export { LogInRequest, CreateUserRequest, ResetPasswordRequest };
