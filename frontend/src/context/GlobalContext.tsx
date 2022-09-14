import { Context, createContext, useMemo, useState } from "react";

import { User } from "../api";

type Setter<T> = (value: T) => void;

interface AuthContextFields {
  user: User | null;
  setUser: Setter<User | null>;
  redirectAfterLogin: string;
  setRedirectAfterLogin: Setter<string>;
}

const GlobalContext: Context<AuthContextFields> = createContext(
  // GlobalContextProvider will set the context value properly.
  null as unknown as AuthContextFields
);

function GlobalContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState("");
  const context = useMemo<AuthContextFields>(
    () => ({ user, setUser, redirectAfterLogin, setRedirectAfterLogin }),
    [user, setUser, redirectAfterLogin, setRedirectAfterLogin]
  );
  return <GlobalContext.Provider value={context}>{children}</GlobalContext.Provider>;
}

export { GlobalContext, GlobalContextProvider };
