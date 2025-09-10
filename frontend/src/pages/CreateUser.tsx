import { useState } from "react";
import { Button, Form } from "react-bootstrap";

import api from "../api";
import { useAlerts } from "../hooks/alerts";

export default function ResetPassword() {
  const [data, setData] = useState({ email: "", name: "" });
  const { alerts, addAlert } = useAlerts();

  const setField = <K extends keyof typeof data>(key: K, value: typeof data[K]) => {
    setData({ ...data, [key]: value });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    api
      .createUser(data)
      .then((user) => {
        addAlert(
          `Created new user with email ${user.email}. They will need to reset their password via email before logging in.`,
          "success"
        );
      })
      .catch(addAlert);
  };

  return (
    <Form onSubmit={onSubmit}>
      <Form.Group controlId="email">
        <Form.Label>Email address</Form.Label>
        <Form.Control required type="email" onChange={(e) => setField("email", e.target.value)} />
      </Form.Group>
      <Form.Group controlId="name">
        <Form.Label>Name</Form.Label>
        <Form.Control required type="text" onChange={(e) => setField("name", e.target.value)} />
      </Form.Group>
      <Button type="submit">Create user</Button>
      {alerts}
    </Form>
  );
}
