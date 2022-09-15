import { BrowserRouter, Route, Routes } from "react-router-dom";

import { GlobalContextProvider } from "./context/GlobalContext";
import LoggedInLayout from "./layouts/LoggedInLayout";
import CreatePipeline from "./pages/CreatePipeline";
import CreateUser from "./pages/CreateUser";
import EditPipeline from "./pages/EditPipeline";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Pipelines from "./pages/Pipelines";
import RequestPasswordReset from "./pages/RequestPasswordReset";
import ResetPassword from "./pages/ResetPassword";
import Users from "./pages/Users";

export default function App() {
  return (
    <GlobalContextProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<LoggedInLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pipeline/:pipelineId/edit" element={<EditPipeline />} />
            <Route path="/pipelines" element={<Pipelines />} />
            <Route path="/pipelines/create" element={<CreatePipeline />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/create" element={<CreateUser />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/request-password-reset" element={<RequestPasswordReset />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    </GlobalContextProvider>
  );
}
