import { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useParams } from "react-router-dom";

import api, { Pipeline } from "../api";
import { useAlerts } from "../hooks";

function PipelineView({ id }: { id: string }) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    // TODO: this is a lousy hack to avoid implementing pipeline getById for now
    api
      .getAllPipelines()
      .then((pipelines) => {
        setPipeline(pipelines.filter((p) => p._id === id)[0]);
      })
      .catch(addAlert);
  }, []);

  const setField = <K extends keyof Pipeline>(key: K, value: Pipeline[K]) => {
    setPipeline(pipeline === null ? null : { ...pipeline, [key]: value });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pipeline === null) {
      addAlert("Pipeline not loaded; cannot update");
      return;
    }

    api
      .updatePipeline(pipeline)
      .then(setPipeline)
      .then(() => addAlert("Pipeline saved.", "success"));
  };

  return (
    <Form onSubmit={onSubmit}>
      <Form.Group controlId="name">
        <Form.Label>Name</Form.Label>
        <Form.Control
          required
          type="text"
          value={pipeline?.name || ""}
          onChange={(e) => setField("name", e.target.value)}
        />
      </Form.Group>
      <Form.Group controlId="identifier">
        <Form.Label>Identifier</Form.Label>
        <Form.Control
          required
          type="text"
          value={pipeline?.identifier || ""}
          onChange={(e) => setField("identifier", e.target.value)}
        />
      </Form.Group>
      <Button type="submit">Save</Button>
      {alerts}
    </Form>
  );
}

export default function EditPipeline() {
  const { pipelineId } = useParams();

  return <PipelineView id={pipelineId || ""} />;
}
