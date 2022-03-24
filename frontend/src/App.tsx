import "./index.scss";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { AuthContextProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthContextProvider>
      <div className="d-flex flex-row" style={{ minHeight: "100vh" }}>
        <Sidebar />
        <div className="p-3 flex-grow-1">
          <Outlet />
        </div>
      </div>
    </AuthContextProvider>
  );
}

export default App;
