import { Infer, bake, number, string } from "caketype";

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

const RequestPasswordResetRequest = bake({
  email: string,
});

const CreatePipelineRequest = bake({
  identifier: string,
  name: string,
  stages: number,
});

export {
  LogInRequest,
  CreateUserRequest,
  ResetPasswordRequest,
  RequestPasswordResetRequest,
  CreatePipelineRequest,
};
