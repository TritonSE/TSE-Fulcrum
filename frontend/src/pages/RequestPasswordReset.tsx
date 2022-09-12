import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import api from "../api";
import { useAlerts } from "../hooks";

export default function RequestPasswordReset() {
  const [email, setEmail] = useState("");
  const { alerts, addAlert, clearAlerts } = useAlerts();

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
    <Form onSubmit={onSubmit}>
      <Form.Group controlId="email">
        <Form.Label>Email address</Form.Label>
        <Form.Control type="email" onChange={(e) => setEmail(e.target.value)} />
      </Form.Group>
      <Button type="submit">Request password reset</Button>
      {alerts}
    </Form>
  );
}
