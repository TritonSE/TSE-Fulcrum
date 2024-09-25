import { Router } from "express";
import multer from "multer";

import { ResumeService } from "../services";

import { wrapper } from "./wrappers";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/",
  upload.single("resumeFile"),
  wrapper(async (req) => {
    if (!req.file) {
      return {
        status: 400,
        text: "Missing resumeFile in request body",
      };
    }

    try {
      const result = await ResumeService.upload(req.file);

      return {
        status: 201,
        json: result,
      };
    } catch (error) {
      const errorMessage = (error as { error: string })?.error ?? (error as string);
      return {
        status: 400,
        text: errorMessage,
      };
    }
  }),
);

export default router;
