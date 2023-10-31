import { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";

import api from "../api";
import { useAlerts } from "../hooks";

export default function RequestPasswordReset() {
  const [email, setEmail] = useState("");
  const { alerts, addAlert, clearAlerts } = useAlerts();

  useEffect(() => {
    document.title = "TSE Fulcrum - Request Password Reset";
  }, []);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlerts();
    api
      .requestPasswordReset(email)
      .then(() => {
        addAlert(
          "If there is an active account linked to the email address you entered, you will receive an email with instructions to reset your password.",
          "info"
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
        <h1 style={{ textAlign: "center", width: "200px", margin: "0 auto 0.5rem" }}>
          <img width="64" height="64" src="/logo512.png" alt="TSE logo" />
          <br />
          Request Password Reset
        </h1>
        <Form onSubmit={onSubmit}>
          <Form.Group controlId="email">
            <Form.Label>Email address</Form.Label>
            <Form.Control type="email" onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>
          <br />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Button type="submit">Request password reset</Button>
          </div>
          <br />
          {alerts}
        </Form>
      </div>
    </div>
  );
}
