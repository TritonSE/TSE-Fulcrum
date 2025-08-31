import { useContext, useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { GlobalContext } from "../context/GlobalContext";
import { useAlerts } from "../hooks";

export default function Login() {
  const { user, setUser, redirectAfterLogin } = useContext(GlobalContext);
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

  const setField = <K extends keyof typeof data>(key: K, value: typeof data[K]) => {
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
    <div className="tw:flex tw:items-center tw:justify-center tw:min-h-screen tw:bg-teal-primary tw:text-cream-primary">
      <div className="tw:min-w-[320px] tw:flex tw:flex-col tw:gap-2">
        <h1 className="tw:flex tw:flex-col tw:items-center tw:gap-3">
          <img width="64" height="64" src="/logo512.png" alt="TSE logo" />
          TSE Fulcrum
        </h1>
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
            <Button type="submit">Log in</Button>
            <Button variant="secondary" onClick={onForgotPassword}>
              Forgot password
            </Button>
          </div>
          <br />
          {alerts}
        </Form>
      </div>
    </div>
  );
}
