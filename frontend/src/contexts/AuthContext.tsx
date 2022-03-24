import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { logIn } from "../api";

type User = any;

interface AuthContextType {
  user: any;
  logIn: (...args: Parameters<typeof logIn>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({ user: null, logIn: async () => false });

interface AuthContextProviderProps {
  children: ReactNode;
}

function AuthContextProvider({ children }: AuthContextProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const logInWrapper = async (...args: Parameters<typeof logIn>) => {
    const response = await logIn(...args);
    if (response.ok) {
      setUser(await response.json());
      return true;
    }
    setUser(null);
    return false;
  };

  const value = useMemo(
    () => ({
      user,
      logIn: logInWrapper,
    }),
    [user, logInWrapper]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

interface AuthContextProviderChildProps {
  children: ReactNode;
  logIn: (...args: Parameters<typeof logIn>) => Promise<boolean>;
}

/*
// Change state from a child component to avoid re-rendering.
function AuthContextProviderChild({ children, logIn }: AuthContextProviderChildProps) {

}
*/

function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
export { AuthContextProvider, useAuth };
