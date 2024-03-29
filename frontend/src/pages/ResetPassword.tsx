import { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { useAlerts } from "../hooks";

export default function ResetPassword() {
  const [data, setData] = useState({ email: "", password: "", passwordResetToken: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const { alerts, addAlert, clearAlerts } = useAlerts();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "TSE Fulcrum - Password Reset";
  }, []);
  useEffect(() => {
    const passwordResetToken = new URLSearchParams(location.search).get("token");
    if (passwordResetToken === null) {
      // Users shouldn't navigate to this page without a token, but in case they
      // do, they probably want to request a password reset instead.
      navigate("/request-password-reset");
      return;
    }
    setData({ ...data, passwordResetToken });
  }, [location]);

  const setField = <K extends keyof typeof data>(key: K, value: typeof data[K]) => {
    setData({ ...data, [key]: value });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlerts();

    if (data.password !== confirmPassword) {
      addAlert("Password and confirmation do not match.");
      return;
    }

    api
      .resetPassword(data)
      .then((successful) => {
        if (successful) {
          navigate("/login");
          return;
        }
        addAlert(
          "Password reset failed. Ensure that the provided email address is linked to an account, and the password reset link isn't expired."
        );
      })
      .catch(addAlert);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0c2a34",
        color: "white",
      }}
    >
      <div style={{ minWidth: "320px" }}>
        <h1 style={{ textAlign: "center" }}>
          <img width="64" height="64" src="/logo512.png" alt="TSE logo" />
          <br />
          Reset Password
        </h1>
        <Form onSubmit={onSubmit}>
          <Form.Group controlId="email">
            <Form.Label>Email address</Form.Label>
            <Form.Control type="email" onChange={(e) => setField("email", e.target.value)} />
          </Form.Group>
          <Form.Group controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" onChange={(e) => setField("password", e.target.value)} />
          </Form.Group>
          <Form.Group controlId="confirm-password">
            <Form.Label>Confirm password</Form.Label>
            <Form.Control type="password" onChange={(e) => setConfirmPassword(e.target.value)} />
          </Form.Group>
          <br />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Button type="submit">Reset password</Button>
          </div>
          <br />
          {alerts}
        </Form>
      </div>
    </div>
  );
}
