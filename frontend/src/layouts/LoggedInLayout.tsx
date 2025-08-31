import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";

import RequireAuth from "./RequireAuth";

export default function LoggedInLayout() {
  return (
    <RequireAuth>
      <div className="tw:flex tw:h-full tw:w-full">
        {/* <Navbar
          expand="sm"
          sticky="top"
          style={{ background: "#eeeeee", paddingLeft: "10px", paddingRight: "10px" }}
        >
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
              <Navbar.Text>{user?.email}&nbsp;&nbsp;</Navbar.Text>
              <Button variant="outline-secondary" onClick={onLogOut}>
                Log out
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Navbar> */}
        <Navbar />
        <div className="tw:overflow-y-auto tw:w-full tw:h-full tw:px-5 tw:py-5">
          <Outlet />
        </div>
      </div>
    </RequireAuth>
  );
}
