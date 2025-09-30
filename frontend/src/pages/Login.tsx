import { Button } from "@tritonse/tse-constellation";
import { use, useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import api from "../api";
import TSELogo from "../components/TSELogo";
import { GlobalContext } from "../context/GlobalContext";
import { useAlerts } from "../hooks/alerts";

export default function Login() {
  const { user, setUser, redirectAfterLogin } = use(GlobalContext);
  const [data, setData] = useState({ email: "", password: "" });
  const { alerts, addAlert, clearAlerts } = useAlerts();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "TSE Fulcrum - Log In";
  }, []);
  useEffect(() => {
    if (user !== null) {
      navigate("/", { replace: true });
    }
  }, [user]);

  const setField = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) => {
    setData({ ...data, [key]: value });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlerts();
    api
      .logIn(data)
      .then((loggedInUser) => {
        if (loggedInUser === null) {
          addAlert("Invalid email address or password.");
          return;
        }
        setUser(loggedInUser);
        navigate(redirectAfterLogin, { replace: true });
      })
      .catch(addAlert);
  };

  const onForgotPassword = () => {
    navigate("/request-password-reset");
  };

  return (
    <TSELogo msg="TSE Fulcrum">
      <Form onSubmit={onSubmit}>
        <Form.Group controlId="email">
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" onChange={(e) => setField("email", e.target.value)} />
        </Form.Group>
        <br />
        <Form.Group controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" onChange={(e) => setField("password", e.target.value)} />
        </Form.Group>
        <br />
        <div className="tw:flex tw:justify-around tw:gap-4">
          <Button type="submit" className="tw:!bg-blue-600 tw:!px-3 tw:!rounded-lg">
            Log in
          </Button>
          <Button onClick={onForgotPassword} className="tw:!bg-accent tw:!px-3 tw:!rounded-lg">
            Forgot password
          </Button>
        </div>
        <br />
        {alerts}
      </Form>
    </TSELogo>
  );
}
