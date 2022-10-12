import React, { useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import { useParams } from "react-router-dom";

import api, { Review, Stage } from "../api";
import { useAlerts, useStateHelper } from "../hooks";
import ApplicationView from "../views/ApplicationView";

export function ReviewView({
  id,
  editable,
  showApplication,
}: {
  id: string;
  editable: boolean;
  showApplication: boolean;
}) {
  const [review, setReview, { getField, setField }] = useStateHelper<Review>();
  const [stage, setStage] = useStateHelper<Stage>();
  const { alerts, addAlert } = useAlerts();

  const getReviewField = (fieldName: string) => review?.fields[fieldName];
  const setReviewField = (fieldName: string, value: boolean | number | string) => {
    if (review !== null) {
      setField("fields", { ...getField("fields"), [fieldName]: value });
    }
  };

  useEffect(() => {
    api
      .getReviewById(id)
      .then((newReview) => {
        // This is a silly hack to make the checkbox default to checked, even when it's false in the database
        setReview({ ...newReview, completed: true });
        api.getStageById(newReview.stage).then(setStage).catch(addAlert);
      })
      .catch(addAlert);
  }, []);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (review === null) {
      addAlert("Review not loaded; cannot update");
      return;
    }

    api
      .updateReview(review)
      .then(setReview)
      .then(() => addAlert("Review saved.", "success"))
      .catch(addAlert);
  };

  return (
    <>
      {showApplication && (
        <>
          <h2>Application</h2>
          {review && <ApplicationView id={review.application} />}
        </>
      )}
      <h2>{`${stage && stage.name} (${(review && review.reviewerEmail) || "unassigned"})`}</h2>
      <Form onSubmit={onSubmit}>
        {stage &&
          stage.fieldOrder.map((fieldName) => {
            const field = stage.fields[fieldName];
            let control;
            switch (field.type) {
              case "boolean":
                control = (
                  <Form.Check
                    type="checkbox"
                    checked={!!getReviewField(fieldName)}
                    onChange={(e) => setReviewField(fieldName, e.target.checked)}
                    disabled={!editable}
                  />
                );
                break;
              case "number":
                control = (
                  <Form.Control
                    required
                    type="number"
                    value={"" + getReviewField(fieldName)}
                    onChange={(e) => setReviewField(fieldName, parseFloat(e.target.value))}
                    onWheel={
                      (e) => (e.target as any).blur() /* https://stackoverflow.com/a/67432053 */
                    }
                    disabled={!editable}
                  />
                );
                break;
              default:
                control = (
                  <Form.Control
                    required
                    type="text"
                    value={
                      typeof getReviewField(fieldName) === "undefined"
                        ? ""
                        : getReviewField(fieldName) + ""
                    }
                    onChange={(e) => setReviewField(fieldName, e.target.value)}
                    disabled={!editable}
                  />
                );
                break;
            }
            return (
              <Form.Group controlId={`${id}-${fieldName}`} key={id + fieldName}>
                <Form.Label>{field.label}</Form.Label>
                {control}
                {field.description && <Form.Text>{field.description}</Form.Text>}
                <br />
              </Form.Group>
            );
          })}
        {editable && (
          <>
            <Form.Check
              label="I am finished with this review"
              checked={!!getField("completed")}
              onChange={(e) => setField("completed", e.target.checked)}
            />
            <Form.Text>Leave this unchecked if you want to save a draft</Form.Text>
            <br />
            <Button type="submit" variant="success">
              Save
            </Button>
          </>
        )}
        {alerts}
      </Form>
    </>
  );
}

export default function EditReview() {
  const { reviewId } = useParams();
  return <ReviewView id={reviewId || ""} editable showApplication />;
}
