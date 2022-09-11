import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import Applications from "./pages/Applications";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import RequestPasswordReset from "./pages/RequestPasswordReset";
import ResetPassword from "./pages/ResetPassword";
import { requireAuth } from "./components/RequireAuth";

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="applications" element={requireAuth(<Applications />)} />
          <Route path="login" element={<Login />} />
          <Route path="request-password-reset" element={<RequestPasswordReset />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);
