import { useContext } from "react";
import { Button, Nav, NavDropdown, Navbar } from "react-bootstrap";
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
        <Navbar expand="sm" sticky="top" style={{ background: "#eeeeee" }}>
          <Navbar.Brand href="/">TSE Fulcrum</Navbar.Brand>
          <Navbar.Toggle aria-controls="responsive-navbar-nav" />
          <Navbar.Collapse id="responsive-navbar-nav">
            <Nav className="me-auto">
              <NavDropdown title="Admin use only">
                <NavDropdown.Item href="/reviews">Reassign reviewers</NavDropdown.Item>
                <NavDropdown.Item href="/stages">View all candidates by stage</NavDropdown.Item>
              </NavDropdown>
            </Nav>
            <Nav>
              <Navbar.Text>{user?.email}</Navbar.Text>
              <Button variant="outline-secondary" onClick={onLogOut}>
                Log out
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <Outlet />
      </>
    </RequireAuth>
  );
}
