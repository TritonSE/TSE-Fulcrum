import { use, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { GlobalContext } from "../context/GlobalContext";

import type { ReactElement } from "react";

export default function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const { user, setUser, setRedirectAfterLogin } = use(GlobalContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user === null) {
      // No user in GlobalContext, but the user might still have a valid session token.
      void api.me().then((me) => {
        if (me !== null) {
          setUser(me);
          return;
        }
        // User is not logged in.
        setRedirectAfterLogin(location.pathname + location.search + location.hash);
        navigate("/login", { replace: true });
      });
    }
  }, []);

  return children;
}
