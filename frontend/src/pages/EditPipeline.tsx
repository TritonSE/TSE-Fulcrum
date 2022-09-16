import { useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import { useParams } from "react-router-dom";

import api, { Pipeline } from "../api";
import { useAlerts, useStateHelper } from "../hooks";

function PipelineView({ id }: { id: string }) {
  const [pipeline, setPipeline, { getField, setField }] = useStateHelper<Pipeline>();
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    // TODO: this is a lousy hack to avoid implementing pipeline getById for now
    api
      .getAllPipelines()
      .then((pipelines) => {
        setPipeline(pipelines.filter((p) => p._id === id)[0] || null);
      })
      .catch(addAlert);
  }, []);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pipeline === null) {
      addAlert("Pipeline not loaded; cannot update");
      return;
    }

    api
      .updatePipeline(pipeline)
      .then(setPipeline)
      .then(() => addAlert("Pipeline saved.", "success"))
      .catch(addAlert);
  };

  return (
    <Form onSubmit={onSubmit}>
      <Form.Group controlId="name">
        <Form.Label>Name</Form.Label>
        <Form.Control
          required
          type="text"
          disabled={pipeline === null}
          value={getField("name") || ""}
          onChange={(e) => setField("name", e.target.value)}
        />
      </Form.Group>
      <Form.Group controlId="identifier">
        <Form.Label>Identifier</Form.Label>
        <Form.Control
          required
          type="text"
          disabled={pipeline === null}
          value={getField("identifier") || ""}
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
