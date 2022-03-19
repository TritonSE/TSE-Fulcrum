import { CSSProperties } from "react";
import { useResolvedPath, useMatch, useNavigate, LinkProps } from "react-router-dom";
import {
  BsBarChartSteps,
  BsBookmarkCheckFill,
  BsChatRightTextFill,
  BsGearFill,
  BsInboxFill,
  BsPeopleFill,
  BsPersonFill,
} from "react-icons/bs";
import { IconType } from "react-icons";
import Button from "react-bootstrap/Button";

function NavButton({ to, children }: LinkProps) {
  // Determine whether the link points to the current page.
  const resolved = useResolvedPath(to);
  const active = !!useMatch({
    path: resolved.pathname,
    end: true,
  });

  const variant = active ? "outline-primary" : "outline-secondary";

  const style: CSSProperties = {
    width: "100%",
    borderRadius: 0,
    borderWidth: "2px",
  };
  if (!active) {
    style.borderColor = "transparent";
  }

  const navigate = useNavigate();
  return (
    <Button variant={variant} style={style} onClick={() => navigate(to)}>
      {children}
    </Button>
  );
}

interface IconLabelProps {
  icon: IconType;
  text: string;
}

function IconLabel({ icon: IconComponent, text }: IconLabelProps) {
  return (
    <div className="text-start">
      <IconComponent />
      <span className="d-inline-block" style={{ width: "1em" }} />
      {text}
    </div>
  );
}

function Sidebar() {
  const links: [string, IconType, string][] = [
    ["/assigned", BsBookmarkCheckFill, "Assigned"],
    ["/applications", BsInboxFill, "Applications"],
    ["/reviews", BsChatRightTextFill, "Reviews"],
    ["/users", BsPersonFill, "Users"],
    ["/groups", BsPeopleFill, "Groups"],
    ["/pipelines", BsBarChartSteps, "Pipelines"],
    ["/admin", BsGearFill, "Admin"],
  ];

  return (
    <div className="border-end child-mt-3" style={{ width: "10rem" }}>
      <nav className="border-bottom">
        <NavButton to="/">
          <p className="h5 m-1">TSE Fulcrum</p>
        </NavButton>
        {links.map(([to, icon, name]) => (
          <NavButton to={to}>
            <IconLabel icon={icon} text={name} />
          </NavButton>
        ))}
      </nav>
      <div className="text-center">
        <p className="mb-2" style={{ wordBreak: "break-all" }}>
          todo@ucsd.edu
        </p>
        <Button variant="outline-secondary">Log Out</Button>
      </div>
    </div>
  );
}

export default Sidebar;
