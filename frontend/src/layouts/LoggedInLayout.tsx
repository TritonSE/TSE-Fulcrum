import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";

import RequireAuth from "./RequireAuth";

export default function LoggedInLayout() {
  return (
    <RequireAuth>
      <div className="tw:flex tw:h-full tw:w-full">
        <Navbar />
        <div className="tw:overflow-y-auto tw:w-full tw:h-full tw:px-5 tw:py-5">
          <Outlet />
        </div>
      </div>
    </RequireAuth>
  );
}
