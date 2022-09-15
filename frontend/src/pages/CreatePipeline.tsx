import { useState } from "react";
import { Button, Form } from "react-bootstrap";

import api from "../api";
import { useAlerts } from "../hooks";

export default function ResetPassword() {
  const [data, setData] = useState({ name: "", identifier: "", stages: 0 });
  const { alerts, addAlert } = useAlerts();

  const setField = <K extends keyof typeof data>(key: K, value: typeof data[K]) => {
    setData({ ...data, [key]: value });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    api
      .createPipeline(data)
      .then((pipeline) => {
        addAlert(`Created pipeline "${pipeline.name}".`, "success");
      })
      .catch(addAlert);
  };

  return (
    <Form onSubmit={onSubmit}>
      <Form.Group controlId="name">
        <Form.Label>Name</Form.Label>
        <Form.Control required type="text" onChange={(e) => setField("name", e.target.value)} />
      </Form.Group>
      <Form.Group controlId="identifier">
        <Form.Label>Identifier</Form.Label>
        <Form.Control
          required
          type="text"
          onChange={(e) => setField("identifier", e.target.value)}
        />
      </Form.Group>
      <Form.Group controlId="stages">
        <Form.Label>Number of stages</Form.Label>
        <Form.Control
          required
          type="number"
          min="0"
          onChange={(e) => setField("stages", parseInt(e.target.value, 10))}
        />
      </Form.Group>
      <Button type="submit">Create pipeline</Button>
      {alerts}
    </Form>
  );
}
