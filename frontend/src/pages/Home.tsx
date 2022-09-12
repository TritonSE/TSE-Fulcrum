import { useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import RequireAuth from "../RequireAuth";

export default function Home() {
  const { user } = useContext(GlobalContext);
  return (
    <RequireAuth>
      <p>{`Logged in as ${user?.email}`}</p>
    </RequireAuth>
  );
}
