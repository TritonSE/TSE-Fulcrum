import { useContext } from "react";
import { Button, Navbar } from "react-bootstrap";
import { Outlet, useNavigate } from "react-router-dom";

import api from "../api";
import { GlobalContext } from "../context/GlobalContext";

import RequireAuth from "./RequireAuth";

export default function LoggedInLayout() {
  const { user, setUser } = useContext(GlobalContext);
  const navigate = useNavigate();

  const onLogOut = () => {
    api.logOut().then(() => {
      setUser(null);
      navigate("/login");
    });
  };

  return (
    <RequireAuth>
      <>
        <Navbar expand="lg" sticky="top">
          <Navbar.Brand href="/">TSE Fulcrum</Navbar.Brand>
          <Navbar.Toggle aria-controls="responsive-navbar-nav" />
          <Navbar.Collapse id="responsive-navbar-nav" className="justify-content-end">
            <Navbar.Text>{user?.email}</Navbar.Text>
            <Button variant="outline-secondary" onClick={onLogOut}>
              Log out
            </Button>
          </Navbar.Collapse>
        </Navbar>
        <Outlet />
      </>
    </RequireAuth>
  );
}
