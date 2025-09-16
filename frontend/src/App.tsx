import { ThemeProvider } from "@tritonse/tse-constellation";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { GlobalContextProvider } from "./context/GlobalContext";
import LoggedInLayout from "./layouts/LoggedInLayout";
import Apply from "./pages/Apply";
import EditReview from "./pages/EditReview";
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import Login from "./pages/Login";
import RequestPasswordReset from "./pages/RequestPasswordReset";
import ResetPassword from "./pages/ResetPassword";
import StageApplications from "./pages/StageApplications";
import ViewApplication from "./pages/ViewApplication";
import ViewReviews from "./pages/ViewReviews";

export default function App() {
  return (
    <GlobalContextProvider>
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            <Route element={<LoggedInLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/application/:applicationId" element={<ViewApplication />} />
              <Route path="/review/:reviewId/edit" element={<EditReview />} />
              <Route path="/review/:reviewId/interview" element={<Interview />} />
              <Route path="/reviews" element={<ViewReviews />} />
              <Route path="/stage/:stageId/applications" element={<StageApplications />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/request-password-reset" element={<RequestPasswordReset />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/interview/:reviewId" element={<Interview />} />
            <Route path="/apply" element={<Apply />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </GlobalContextProvider>
  );
}
