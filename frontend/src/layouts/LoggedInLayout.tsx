import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";

import RequireAuth from "./RequireAuth";

export default function LoggedInLayout() {
  return (
    <RequireAuth>
      <div className="tw:flex tw:h-full tw:w-full">
        <Navbar />
        <div className="tw:overflow-auto tw:w-full tw:h-full tw:p-10">
          <Outlet />
        </div>
      </div>
    </RequireAuth>
  );
}
