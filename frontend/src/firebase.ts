import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIq2RxaF0x-qN3MW-AJg_Kf2DKegIK_ys",
  authDomain: "tse-fulcrum.firebaseapp.com",
  projectId: "tse-fulcrum",
  storageBucket: "tse-fulcrum.appspot.com",
  messagingSenderId: "506277462634",
  appId: "1:506277462634:web:9ee4c91ea8517c667dc013",
  measurementId: "G-FS413WHV72",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
