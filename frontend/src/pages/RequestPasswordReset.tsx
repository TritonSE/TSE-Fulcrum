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
    <div className="tw:flex tw:items-center tw:justify-center tw:min-h-screen tw:bg-teal-primary tw:text-cream-primary">
      <div className="tw:w-[320px] tw:flex tw:flex-col tw:items-center">
        <h1 className="tw:text-center tw:w-[200px] tw:mx-auto tw:mb-2 tw:flex tw:flex-col tw:items-center tw:gap-2">
          <img width="64" height="64" src="/logo512.png" alt="TSE logo" />
          Request Password Reset
        </h1>
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
      </div>
    </div>
  );
}
