import { Button, Modal } from "@tritonse/tse-constellation";
import React, { use, useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../api";
import Alert from "../components/Alert";
import ApplicationHeader from "../components/ApplicationHeader";
import { GlobalContext } from "../context/GlobalContext";
import { getReviewStatus, ReviewStatus } from "../helpers/review";
import { useAlerts, useStateHelper } from "../hooks/alerts";

import type { Application, Review, Stage } from "../api";

export function ReviewView({ id, showApplication }: { id: string; showApplication: boolean }) {
  const [review, setReview, { getField, setField }] = useStateHelper<Review>();
  const [stage, setStage] = useStateHelper<Stage>();
  const { alerts, addAlert } = useAlerts();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = use(GlobalContext);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [nextReviewId, setNextReviewId] = useState<string | null>(null);
  const [showReassignSuccessModal, setShowReassignSuccessModal] = useState(false);
  const [showConfirmReassignModal, setShowConfirmReassignModal] = useState(false);

  const ownsReview = useMemo(
    () => user && review && user.email === review.reviewerEmail,
    [user, review],
  );

  const editable = useMemo(
    () => !!(user && review && (user.isAdmin || user.email === review.reviewerEmail)),
    [user, review],
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
  }, [id]);

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
        // If the user is an admin but not the assigned reviewer, don't show pop up
        if (user?.isAdmin && user?.email !== review.reviewerEmail) {
          addAlert("Review saved successfully", "success");
          return;
        }

        if (
          stage &&
          // Coerce the type to PopulatedReview, which this function expect
          // application isn't used so we can provide something of the wrong type
          getReviewStatus({
            ...review,
            stage,
            application: null as unknown as Application,
            applicantYear: 0,
          }) === ReviewStatus.Completed
        ) {
          void api.getNextReview().then((nextReview) => {
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
    <div className="tw:flex tw:flex-col tw:gap-8">
      {!ownsReview && editable && (
        <Alert variant="danger" className="tw:w-full">
          CAREFUL: You are editing a review NOT assigned to you.
        </Alert>
      )}
      {showApplication && review && (
        <ApplicationHeader
          applicationId={review.application}
          reassignReview={editable ? () => setShowConfirmReassignModal(true) : undefined}
          showApplicationLink
        />
      )}
      <div>
        <h2 className="tw:!text-3xl tw:!text-teal-primary">{`${stage && stage.name}`}</h2>
        <Form onSubmit={onSubmit}>
          {stage && stage.hasTechnicalInterview && (
            <>
              <Link
                to={location.pathname.replace("edit", "interview")}
                target="_blank"
                rel="noreferrer noopener"
                className="tw:text-link tw:underline"
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
                      value={`${getReviewField(fieldName)}`}
                      onChange={(e) => {
                        if (e.target.value === "") {
                          clearReviewField(fieldName);
                        } else {
                          setReviewField(fieldName, Number.parseFloat(e.target.value));
                        }
                      }}
                      onWheel={
                        // eslint-disable-next-line ts/no-unsafe-return, ts/no-unsafe-call, ts/no-unsafe-member-access
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
                          : `${getReviewField(fieldName)}`
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
                        : `${getReviewField(fieldName)}`}
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
            <Button type="submit" className="tw:!px-2.5 tw:!py-1.5">
              Save
            </Button>
          )}
          {alerts}
        </Form>
      </div>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Review saved!"
        content={nextReviewId === null ? "You've finished all your assigned reviews!" : ""}
        primaryActionComponent={
          <Link to={nextReviewId === null ? "/" : `/review/${nextReviewId}/edit`}>
            <Button onClick={() => setShowSuccessModal(false)}>
              {nextReviewId === null ? "Back to Homepage" : "Next Review"}
            </Button>
          </Link>
        }
        secondaryActionComponent={
          <Button onClick={() => setShowSuccessModal(false)} variant="secondary">
            Close
          </Button>
        }
        withDividers={false}
      />

      <Modal
        isOpen={showConfirmReassignModal}
        onClose={() => {
          setShowConfirmReassignModal(false);
        }}
        title="Are you sure?"
        content="Are you sure you want to reassign this review?"
        withDividers={false}
        primaryActionComponent={
          <Button
            onClick={() => {
              setShowConfirmReassignModal(false);
              onReassignClicked();
            }}
          >
            Yes, reassign!
          </Button>
        }
        secondaryActionComponent={
          <Button variant="secondary" onClick={() => setShowConfirmReassignModal(false)}>
            Cancel
          </Button>
        }
      />

      <Modal
        isOpen={showReassignSuccessModal}
        onClose={() => {
          navigate("/");
        }}
        withDividers={false}
        title="Reassigned successfully!"
        content=""
        primaryActionComponent={
          <Link to="/">
            <Button>Back to Homepage</Button>
          </Link>
        }
      />
    </div>
  );
}

export default function EditReview() {
  const { reviewId } = useParams();
  return <ReviewView id={reviewId || ""} showApplication />;
}
