import { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";

import api from "../api";
import TSELogo from "../components/TSELogo";
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
    <TSELogo msg="Request Password Reset">
      <Form onSubmit={onSubmit} className="tw:flex tw:flex-col tw:gap-5 tw:w-full">
        <Form.Group controlId="email">
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" onChange={(e) => setEmail(e.target.value)} />
        </Form.Group>
        <div className="tw:flex tw:justify-center">
          <Button type="submit">Request password reset</Button>
        </div>
        {alerts}
      </Form>
    </TSELogo>
  );
}
