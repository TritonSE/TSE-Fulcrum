import React, { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useParams } from "react-router-dom";

import api, { Pipeline, Stage } from "../api";
import { useAlert, useAlerts, useStateHelper } from "../hooks";

// TODO: warn user if attempting to leave page with unsaved changes

function JSONEdit<T>({ value, onChange }: { value: T; onChange: (value: T) => void }) {
  // const [text, setText] = useState(JSON.stringify(value, null, 2) || "");
  const { alert, setAlert } = useAlert();
  return (
    <>
      <textarea
        className="form-control"
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          // setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setAlert(null);
          } catch (error) {
            setAlert(error);
          }
        }}
      />
      {alert}
    </>
  );
}

function StageView({ id }: { id: string }) {
  const [stage, setStage, { getField, setField }] = useStateHelper<Stage>();
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api.getStageById(id).then(setStage).catch(addAlert);
  }, []);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (stage === null) {
      addAlert("Stage not loaded; cannot update");
      return;
    }

    api
      .updateStage(stage)
      .then(setStage)
      .then(() => addAlert("Stage saved.", "success"))
      .catch(addAlert);
  };

  return (
    <Form onSubmit={onSubmit}>
      {stage && <h2>Stage: {stage.name}</h2>}
      <Form.Group controlId={`${id}-name`}>
        <Form.Label>Name</Form.Label>
        <Form.Control
          required
          type="text"
          disabled={stage === null}
          value={getField("name") || ""}
          onChange={(e) => setField("name", e.target.value)}
        />
      </Form.Group>
      <Form.Group controlId={`${id}-numReviews`}>
        <Form.Label>Number of reviews</Form.Label>
        <Form.Control
          required
          type="number"
          min="1"
          disabled={stage === null}
          value={"" + getField("numReviews")}
          onChange={(e) => setField("numReviews", parseInt(e.target.value, 10))}
        />
      </Form.Group>
      <Form.Group controlId={`${id}-reviewerEmails`}>
        <Form.Label>Reviewer emails (space separated)</Form.Label>
        <Form.Control
          required
          type="text"
          disabled={stage === null}
          value={getField("reviewerEmails")?.join(" ")}
          onChange={(e) => setField("reviewerEmails", e.target.value.split(" "))}
        />
      </Form.Group>
      <Form.Check
        label="Automatically assign reviewers"
        type="checkbox"
        disabled={stage === null}
        checked={!!getField("autoAssignReviewers")}
        onChange={(e) => setField("autoAssignReviewers", e.target.checked)}
        id={`${id}-autoAssignReviewers`}
      />
      <Form.Check
        label="Notify reviewers when assigned"
        type="checkbox"
        disabled={stage === null}
        checked={!!getField("notifyReviewersWhenAssigned")}
        onChange={(e) => setField("notifyReviewersWhenAssigned", e.target.checked)}
        id={`${id}-notifyReviewersWhenAssigned`}
      />
      <Form.Check
        label="Has technical interview"
        type="checkbox"
        disabled={stage === null}
        checked={!!getField("hasTechnicalInterview")}
        onChange={(e) => setField("hasTechnicalInterview", e.target.checked)}
        id={`${id}-hasTechnicalInterview`}
      />
      <Form.Group controlId={`${id}-fields`}>
        <Form.Label>Fields</Form.Label>
        <JSONEdit
          value={getField("fields") || {}}
          onChange={(value) => setField("fields", value || {})}
        />
      </Form.Group>
      <Form.Group controlId={`${id}-fieldOrder`}>
        <Form.Label>Field order</Form.Label>
        <JSONEdit
          value={getField("fieldOrder") || []}
          onChange={(value) => setField("fieldOrder", value || [])}
        />
      </Form.Group>
      <Button type="submit">Save stage</Button>
      {alerts}
    </Form>
  );
}

function PipelineView({ id }: { id: string }) {
  const [pipeline, setPipeline, { getField, setField }] = useStateHelper<Pipeline>();
  const [stageIds, setStageIds] = useState<string[]>([]);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    // TODO: this is a lousy hack to avoid implementing pipeline getById for now
    api
      .getAllPipelines()
      .then((pipelines) => {
        setPipeline(pipelines.filter((p) => p._id === id)[0] || null);
      })
      .catch(addAlert);
  }, [id]);

  useEffect(() => {
    api
      .getStagesByPipeline(id)
      .then((stages) => setStageIds(stages.map((stage) => stage._id)))
      .catch(addAlert);
  }, [id]);

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
    <>
      <Form onSubmit={onSubmit}>
        {pipeline && <h2>Pipeline: {pipeline.name}</h2>}
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
        <Button type="submit">Save pipeline</Button>
        {alerts}
      </Form>
      {stageIds.map((stageId) => (
        <StageView id={stageId} />
      ))}
    </>
  );
}

export default function EditPipeline() {
  const { pipelineId } = useParams();

  return <PipelineView id={pipelineId || ""} />;
}
