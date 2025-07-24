import { Router } from "express";
import mongoose from "mongoose";

import { BulkAdvanceOrRejectRequest } from "../cakes";
import { ProgressService } from "../services";

import { authWrapper } from "./wrappers";

const router = Router();

router.get(
  "/",
  authWrapper(async (_user, req) => {
    const result = await ProgressService.getFiltered(
      Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, String(v)])),
    );
    return {
      status: 200,
      json: result.map((p) => ProgressService.serialize(p)),
    };
  }),
);

router.post(
  "/bulk_advance",
  authWrapper(async (_user, req) => {
    const bodyResult = BulkAdvanceOrRejectRequest.check(req.body);
    if (!bodyResult.ok) {
      return {
        status: 400,
        text: bodyResult.error.toString(),
      };
    }

    // Concurrently advance each application asynchronously and save the results
    const results = await Promise.all(
      bodyResult.value.applicationIds.map(async (applicationId) => {
        const result = await ProgressService.advanceApplication(
          new mongoose.Types.ObjectId(applicationId),
          bodyResult.value.pipelineIdentifier,
        );
        return { applicationId, result };
      }),
    );

    return {
      status: 200,
      // Map each application ID to its result (string error or new Progress object if successful)
      json: results.reduce(
        (prevObj, { applicationId, result }) => ({
          ...prevObj,
          [applicationId]: { success: typeof result !== "string", value: result },
        }),
        {},
      ),
    };
  }),
);

router.post(
  "/bulk_reject",
  authWrapper(async (_user, req) => {
    const bodyResult = BulkAdvanceOrRejectRequest.check(req.body);
    if (!bodyResult.ok) {
      return {
        status: 400,
        text: bodyResult.error.toString(),
      };
    }

    // Concurrently reject each application asynchronously and save the results
    const results = await Promise.all(
      bodyResult.value.applicationIds.map(async (applicationId) => {
        const result = await ProgressService.rejectApplication(
          new mongoose.Types.ObjectId(applicationId),
          bodyResult.value.pipelineIdentifier,
        );
        return { applicationId, result };
      }),
    );

    return {
      status: 200,
      // Map each application ID to its result (string error or new Progress object if successful)
      json: results.reduce(
        (prevObj, { applicationId, result }) => ({
          ...prevObj,
          [applicationId]: { success: typeof result !== "string", value: result },
        }),
        {},
      ),
    };
  }),
);

export default router;
