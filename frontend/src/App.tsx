import { BrowserRouter, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import { GlobalContextProvider } from "./context/GlobalContext";
import Home from "./pages/Home";
import Users from "./pages/Users";
import RequestPasswordReset from "./pages/RequestPasswordReset";
import ResetPassword from "./pages/ResetPassword";
import LoggedInLayout from "./layouts/LoggedInLayout";

export default function App() {
  return (
    <GlobalContextProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<LoggedInLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/request-password-reset" element={<RequestPasswordReset />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    </GlobalContextProvider>
  );
}
