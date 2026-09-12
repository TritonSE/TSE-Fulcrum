import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZcosPO_ZB7O1nFQy0euH-19XhKSawZks",
  authDomain: "fulcrum-dev-fe70f.firebaseapp.com",
  projectId: "fulcrum-dev-fe70f",
  storageBucket: "fulcrum-dev-fe70f.firebasestorage.app",
  messagingSenderId: "642358457725",
  appId: "1:642358457725:web:44ca3ba06da1dbaebd8814",
  measurementId: "G-0L7ZX2WY96",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
