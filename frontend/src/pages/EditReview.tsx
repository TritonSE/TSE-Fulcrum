import React, { useContext, useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";

import api, { Application, Review, Stage } from "../api";
import { GlobalContext } from "../context/GlobalContext";
import { getReviewStatus, ReviewStatus } from "../helpers/review";
import { useAlerts, useStateHelper } from "../hooks";
import ApplicationView from "../views/ApplicationView";

export function ReviewView({ id, showApplication }: { id: string; showApplication: boolean }) {
  const [review, setReview, { getField, setField }] = useStateHelper<Review>();
  const [stage, setStage] = useStateHelper<Stage>();
  const { alerts, addAlert } = useAlerts();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(GlobalContext);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [nextReviewId, setNextReviewId] = useState<string | null>(null);
  const [showReassignSuccessModal, setShowReassignSuccessModal] = useState(false);
  const [showConfirmReassignModal, setShowConfirmReassignModal] = useState(false);

  const editable = useMemo(
    () => !!(user && review && (user.isAdmin || user.email === review.reviewerEmail)),
    [user, review]
  );

  const getReviewField = (fieldName: string) => review?.fields[fieldName];
  const setReviewField = (fieldName: string, value: boolean | number | string) => {
    if (review !== null) {
      setField("fields", { ...getField("fields"), [fieldName]: value });
    }
  };
  // Remove this field from the review object when the user erases it, so that we don't save a value
  const clearReviewField = (fieldName: string) => {
    if (review !== null) {
      const fields = { ...getField("fields") };
      delete fields[fieldName];
      setField("fields", fields);
    }
  };

  useEffect(() => {
    api
      .getReviewById(id)
      .then((newReview) => {
        setReview(newReview);
        api.getStageById(newReview.stageId).then(setStage).catch(addAlert);
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
      .then(() => {
        if (
          stage &&
          // Coerce the type to PopulatedReview, which this function expect
          // application isn't used so we can provide something of the wrong type
          getReviewStatus({ ...review, stage, application: null as unknown as Application }) ===
            ReviewStatus.Completed
        ) {
          api.getNextReview().then((nextReview) => {
            setNextReviewId(nextReview?._id ?? null);
            setShowSuccessModal(true);
          });
        } else {
          addAlert("Review saved as draft", "success");
        }
      })
      .catch(addAlert);
  };

  const onReassignClicked = () => {
    if (review === null) {
      addAlert("Review not loaded; cannot reassign");
      return;
    }

    api
      .reassignReview(review._id)
      .then(() => setShowReassignSuccessModal(true))
      .catch(addAlert);
  };

  return (
    <div style={{ padding: "10px" }}>
      {showApplication && (
        <>
          <h2>Application</h2>
          {editable ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowConfirmReassignModal(true)}
            >
              Reassign
            </Button>
          ) : null}
          {review && <ApplicationView id={review.application} />}
        </>
      )}
      <h2>{`${stage && stage.name} (${(review && review.reviewerEmail) || "unassigned"})`}</h2>
      <Form onSubmit={onSubmit}>
        {stage && stage.hasTechnicalInterview && (
          <>
            <Link
              to={location.pathname.replace("edit", "interview")}
              target="_blank"
              rel="noreferrer noopener"
            >
              Technical interview
            </Link>
            <br />
            <br />
          </>
        )}
        {stage &&
          stage.fieldOrder.map((fieldName) => {
            const field = stage.fields[fieldName];
            let control;
            switch (field.type) {
              case "number":
                control = (
                  <Form.Control
                    type="number"
                    value={"" + getReviewField(fieldName)}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        clearReviewField(fieldName);
                      } else {
                        setReviewField(fieldName, parseFloat(e.target.value));
                      }
                    }}
                    onWheel={
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (e) => (e.target as any).blur() /* https://stackoverflow.com/a/67432053 */
                    }
                    disabled={!editable}
                  />
                );
                break;
              default:
                control = editable ? (
                  <Form.Control
                    as="textarea"
                    rows={10}
                    value={
                      typeof getReviewField(fieldName) === "undefined"
                        ? ""
                        : getReviewField(fieldName) + ""
                    }
                    onChange={(e) => {
                      if (e.target.value === "") {
                        clearReviewField(fieldName);
                      } else {
                        setReviewField(fieldName, e.target.value);
                      }
                    }}
                  />
                ) : (
                  <div style={{ whiteSpace: "pre-line" }}>
                    {typeof getReviewField(fieldName) === "undefined"
                      ? ""
                      : getReviewField(fieldName) + ""}
                  </div>
                );
                break;
            }
            return (
              <Form.Group controlId={`${id}-${fieldName}`} key={id + fieldName}>
                <Form.Label>{field.label}</Form.Label>
                {field.description && (
                  <>
                    <br />
                    <Form.Text>
                      {field.description}{" "}
                      {field.rubricLink && (
                        <a href={field.rubricLink} target="_blank" rel="noreferrer noopener">
                          See rubric
                        </a>
                      )}
                    </Form.Text>
                  </>
                )}
                {control}
                <br />
              </Form.Group>
            );
          })}
        {editable && (
          <Button type="submit" variant="success">
            Save
          </Button>
        )}
        {alerts}
      </Form>

      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Review saved!</Modal.Title>
        </Modal.Header>
        {nextReviewId === null ? (
          <Modal.Body>You&apos;ve finished all your assigned reviews!</Modal.Body>
        ) : null}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSuccessModal(false)}>
            Close
          </Button>
          <Link to={nextReviewId === null ? "/" : `/review/${nextReviewId}/edit`}>
            <Button variant="primary">
              {nextReviewId === null ? "Back to Homepage" : "Next Review"}
            </Button>
          </Link>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showConfirmReassignModal}
        onHide={() => {
          setShowConfirmReassignModal(false);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Are you sure?</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to reassign this review?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmReassignModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowConfirmReassignModal(false);
              onReassignClicked();
            }}
          >
            Yes, reassign!
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showReassignSuccessModal}
        onHide={() => {
          navigate("/");
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Reassigned successfully!</Modal.Title>
        </Modal.Header>
        <Modal.Footer>
          <a href="/">
            <Button variant="primary">Back to Homepage</Button>
          </a>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default function EditReview() {
  const { reviewId } = useParams();
  return <ReviewView id={reviewId || ""} showApplication />;
}
