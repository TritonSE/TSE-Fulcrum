// https://stackoverflow.com/questions/69746672/unable-to-resolve-path-to-module-firebase-admin-app-eslint
// eslint-disable-next-line import/no-unresolved
import * as firebase from "firebase-admin/app";
// eslint-disable-next-line import/no-unresolved
import { getDownloadURL, getStorage } from "firebase-admin/storage";
import _ from "multer";

import env from "../env";

import CryptoService from "./CryptoService";

type ResumeUploadResult = {
  resumeUrl: string;
};

if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  firebase.initializeApp({
    credential: firebase.cert(
      JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as firebase.ServiceAccount,
    ),
    storageBucket: "tse-fulcrum.appspot.com",
  });
} else {
  console.error("Missing Firebase service account key");
}

const firebaseStorage = getStorage();
const firebaseBucket = firebaseStorage.bucket();

class ResumeService {
  async upload(resumeFile: Express.Multer.File): Promise<ResumeUploadResult> {
    // Put each resume in a randomly named folder, to avoid name collisions
    const randomToken = CryptoService.generateToken();
    const filename = `${randomToken}/${resumeFile.originalname}`;

    const file = firebaseBucket.file(filename);
    await file.save(resumeFile.buffer);

    const resumeUrl = await getDownloadURL(file);
    return { resumeUrl };
  }
}

export default new ResumeService();
