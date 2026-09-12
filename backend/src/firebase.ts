import * as firebase from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

import env from "./env";

if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  firebase.initializeApp({
    credential: firebase.cert(
      JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as firebase.ServiceAccount,
    ),
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });
} else {
  console.error("Missing Firebase service account key");
}

const firebaseStorage = getStorage();
const firebaseBucket = firebaseStorage.bucket();
const auth = getAuth();

export { auth, firebaseBucket };
