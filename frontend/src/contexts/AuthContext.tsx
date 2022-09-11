import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { PublicUser } from "shared";
import { logIn } from "../api";

interface AuthContextType {
  user: PublicUser | null;
  logIn: (...args: Parameters<typeof logIn>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({ user: null, logIn: async () => false });

interface AuthContextProviderProps {
  children: ReactNode;
}

function AuthContextProvider({ children }: AuthContextProviderProps) {
  const [user, setUser] = useState<PublicUser | null>(null);
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

function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
export { AuthContextProvider, useAuth };
