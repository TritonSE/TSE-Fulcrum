import { getDownloadURL } from "firebase-admin/storage";
import _ from "multer";

import { firebaseBucket } from "../firebase";

import CryptoService from "./CryptoService";

type ResumeUploadResult = {
  resumeUrl: string;
};

class ResumeService {
  async upload(resumeFile: Express.Multer.File): Promise<ResumeUploadResult> {
    // 1st level: folder by year (e.g. 2025_resumes)
    // 2nd level: randomly named folder, to avoid collisions in applicant name or filename
    const randomToken = CryptoService.generateToken();
    const filename = `${new Date().getFullYear()}_resumes/${randomToken}/${
      resumeFile.originalname
    }`;

    const file = firebaseBucket.file(filename);
    await file.save(resumeFile.buffer);

    const resumeUrl = await getDownloadURL(file);
    return { resumeUrl };
  }
}

export default new ResumeService();
