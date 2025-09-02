import { useEffect, useState } from "react";
import { Button, Form, Table } from "react-bootstrap";
import { Link } from "react-router-dom";

import api, { PopulatedReview } from "../api";
import { getReviewStatus, getReviewStatusHumanReadable, ReviewStatus } from "../helpers/review";
import { useAlerts } from "../hooks";
import { formatQuarter, makeComparator } from "../util";

function AutoAssignButton({
  id,
  addAlert,
}: {
  id: string;
  addAlert: (message: unknown, variant?: string) => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const onClick = () => {
    api
      .autoAssignReview(id)
      .then((review) => {
        addAlert(`Auto-assigned review to ${review.reviewerEmail}`, "success");
        setEnabled(false);
      })
      .catch(addAlert);
  };
  return (
    <Button onClick={onClick} disabled={!enabled}>
      Auto-assign reviewer
    </Button>
  );
}

function ManualAssign({
  id,
  addAlert,
}: {
  id: string;
  addAlert: (message: unknown, variant?: string) => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [reviewerEmail, setReviewerEmail] = useState("");
  const onClick = () => {
    setEnabled(false);
    api
      .assignReview(id, reviewerEmail)
      .then((review) => {
        addAlert(`Assigned review to ${review.reviewerEmail}`, "success");
      })
      .catch((e) => {
        addAlert(e);
        setEnabled(true);
      });
  };
  return (
    <div style={{ display: "flex", flexFlow: "row nowrap" }}>
      <Form.Control
        style={{ maxWidth: "20em" }}
        type="email"
        value={reviewerEmail}
        onChange={(e) => setReviewerEmail(e.target.value)}
        disabled={!enabled}
        placeholder="Reviewer's email address"
      />
      <Button onClick={onClick} disabled={!enabled}>
        Reassign
      </Button>
    </div>
  );
}

// Used to sort reviews by status
const reviewStatusNumericValues = {
  [ReviewStatus.NotStarted]: 0,
  [ReviewStatus.InProgress]: 1,
  [ReviewStatus.Completed]: 2,
};

export default function ReviewsView({
  filter,
  showReassign,
  homepage = false,
}: {
  filter: Record<string, string>;
  showReassign?: boolean;
  homepage?: boolean;
}) {
  const [reviews, setReviews] = useState<PopulatedReview[]>([]);
  const { alerts, addAlert } = useAlerts();

  if (homepage) {
    useEffect(() => {
      document.title = "TSE Fulcrum - Home";
    }, []);
  }
  // TODO: audit all other useEffects to check dependency lists
  useEffect(() => {
    api
      .getFilteredReviews(filter)
      .then((newReviews) =>
        setReviews(
          newReviews
            .slice()
            .sort(
              makeComparator((r) =>
                homepage
                  ? [
                      reviewStatusNumericValues[getReviewStatus(r)],
                      r.stage.name,
                      r.application.gradQuarter,
                      r.application.name,
                      r.reviewerEmail || "",
                      r._id,
                    ]
                  : [
                      r.stage.name,
                      r.application.gradQuarter,
                      r.application.name,
                      r.reviewerEmail || "",
                      r._id,
                    ]
              )
            )
        )
      )
      .catch(addAlert);
  }, [filter]);

  return (
    <div>
      {reviews.length === 0 ? (
        "No reviews to display."
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Name</th>
              <th>Pronouns</th>
              {homepage && <th>Email</th>}
              <th>Degree Timeline</th>
              {!homepage && <th>Past Reviewers</th>}
              {!homepage && <th>Reviewer</th>}
              <th>Status</th>
              {showReassign && <th>Reassign</th>}
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => {
              const status = getReviewStatusHumanReadable(review);
              const pastReviewers = Object.entries(
                reviews
                  .filter((r) => review.application._id === r.application._id)
                  .map((r) => [r.stage.name, r.reviewerEmail || "(unassigned)"])
                  .reduce(
                    (o, [stage, reviewer]) => ({ ...o, [stage]: [...(o[stage] || []), reviewer] }),
                    {} as Record<string, string[]>
                  )
              ).sort();
              return (
                <tr key={review._id}>
                  <td>{review.stage.name}</td>
                  <td>
                    <Link to={`/review/${review._id}/edit`}>{review.application.name}</Link>
                  </td>
                  <td>{review.application.pronouns}</td>
                  {homepage && <td>{review.application.email}</td>}
                  <td>{`${formatQuarter(review.application.startQuarter)} to ${formatQuarter(
                    review.application.gradQuarter
                  )}`}</td>
                  {!homepage && (
                    <td>
                      {pastReviewers.length === 0
                        ? "(none)"
                        : pastReviewers.map(([stage, reviewers]) => (
                            <p key={stage}>{`${stage}: ${reviewers.slice().sort().join(" ")}`}</p>
                          ))}
                    </td>
                  )}
                  {!homepage && (
                    <td>
                      {review.reviewerEmail || (
                        <AutoAssignButton id={review._id} addAlert={addAlert} />
                      )}
                    </td>
                  )}
                  <td>{status}</td>
                  {showReassign && (
                    <td>
                      <ManualAssign id={review._id} addAlert={addAlert} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {alerts}
    </div>
  );
}

ReviewsView.defaultProps = {
  showReassign: false,
  homepage: false,
};
