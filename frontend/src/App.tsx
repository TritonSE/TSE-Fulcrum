import { BrowserRouter, Route, Routes } from "react-router-dom";

import { GlobalContextProvider } from "./context/GlobalContext";
import LoggedInLayout from "./layouts/LoggedInLayout";
import CreatePipeline from "./pages/CreatePipeline";
import CreateUser from "./pages/CreateUser";
import EditPipeline from "./pages/EditPipeline";
import EditReview from "./pages/EditReview";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Pipelines from "./pages/Pipelines";
import RequestPasswordReset from "./pages/RequestPasswordReset";
import ResetPassword from "./pages/ResetPassword";
import StageApplications from "./pages/StageApplications";
import Stages from "./pages/Stages";
import Users from "./pages/Users";
import ViewApplication from "./pages/ViewApplication";
import ViewReviews from "./pages/ViewReviews";

export default function App() {
  return (
    <GlobalContextProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<LoggedInLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/application/:applicationId" element={<ViewApplication />} />
            <Route path="/pipeline/:pipelineId/edit" element={<EditPipeline />} />
            <Route path="/pipelines" element={<Pipelines />} />
            <Route path="/pipelines/create" element={<CreatePipeline />} />
            <Route path="/review/:reviewId/edit" element={<EditReview />} />
            <Route path="/reviews" element={<ViewReviews />} />
            <Route path="/stages" element={<Stages />} />
            <Route path="/stage/:stageId/applications" element={<StageApplications />} />
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
