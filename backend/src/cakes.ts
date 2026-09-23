/* eslint-disable ts/no-redeclare */
import { any, array, bake, boolean, number, optional, string, union } from "caketype";

import { pipelineIdentifiers } from "./config";

import type { Infer } from "caketype";

const LogInRequest = bake({
  idToken: string,
} as const);

type LogInRequest = Infer<typeof LogInRequest>;

const CreateUserRequest = bake({
  email: string,
  name: string,
  onlyFirstYearPhoneScreen: optional(boolean),
  onlyFirstYearTechnical: optional(boolean),
  isDoingInterviewAlone: optional(boolean),
  assignedStageIds: optional(array(number)),
  // TODO: add support for arbitrary-key record fields to caketype
  maxReviewsPerStageIdentifier: optional(any),
  isAdmin: optional(boolean),
});

type CreateUserRequest = Infer<typeof CreateUserRequest>;

const PipelineIdentifier = union(...pipelineIdentifiers);

const BulkAdvanceOrRejectRequest = bake({
  pipelineIdentifier: PipelineIdentifier,
  applicationIds: array(string),
});

export { BulkAdvanceOrRejectRequest, CreateUserRequest, LogInRequest };
