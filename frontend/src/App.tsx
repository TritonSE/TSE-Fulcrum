import "./index.scss";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <div className="d-flex flex-row" style={{ minHeight: "100vh" }}>
      <Sidebar />
      <div className="p-3 flex-grow-1">
        <Outlet />
      </div>
    </div>
  );
}

export default App;
