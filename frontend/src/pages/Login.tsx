import { Button } from "@tritonse/tse-constellation";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { use, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import TSELogo from "../components/TSELogo";
import { GlobalContext } from "../context/GlobalContext";
import { auth } from "../firebase";
import { useAlerts } from "../hooks/alerts";

const provider = new GoogleAuthProvider();

export default function Login() {
  const { user, setUser, redirectAfterLogin } = use(GlobalContext);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { alerts, addAlert, clearAlerts } = useAlerts();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "TSE Fulcrum - Log In";
  }, []);
  useEffect(() => {
    if (user !== null) {
      navigate("/", { replace: true });
    }
  }, [user]);

  const onSignIn = () => {
    clearAlerts();
    setIsSigningIn(true);
    signInWithPopup(auth, provider)
      .then(async (credential) => {
        const idToken = await credential.user.getIdToken();
        const loggedInUser = await api.logIn({ idToken });
        if (loggedInUser === null) {
          await signOut(auth);
          addAlert("This Google account isn't registered for TSE Fulcrum. Contact an admin.");
          return;
        }
        setUser(loggedInUser);
        navigate(redirectAfterLogin, { replace: true });
      })
      .catch(addAlert)
      .finally(() => setIsSigningIn(false));
  };

  return (
    <TSELogo msg="TSE Fulcrum">
      <div className="tw:flex tw:justify-center">
        <Button
          onClick={onSignIn}
          disabled={isSigningIn}
          className="tw:!bg-blue-600 tw:!px-3 tw:!rounded-lg"
        >
          Sign in with Google
        </Button>
      </div>
      <br />
      {alerts}
    </TSELogo>
  );
}
