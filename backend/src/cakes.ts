import { Infer, array, bake, string, union } from "caketype";

import { pipelineIdentifiers } from "./config";

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

const PipelineIdentifier = union(...pipelineIdentifiers);

const BulkAdvanceOrRejectRequest = bake({
  pipelineIdentifier: PipelineIdentifier,
  applicationIds: array(string),
});

export {
  LogInRequest,
  CreateUserRequest,
  ResetPasswordRequest,
  RequestPasswordResetRequest,
  BulkAdvanceOrRejectRequest,
};
