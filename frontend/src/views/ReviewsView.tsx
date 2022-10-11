import { useEffect, useState } from "react";
import { Button, Form, Table } from "react-bootstrap";

import api, { PopulatedReview } from "../api";
import { useAlerts } from "../hooks";

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

/**
 * Create a comparator for sorting objects.
 * @param keyFunc Map each object to an array of values to sort by.
 */
function makeComparator<T, K extends (number | string)[]>(
  keyFunc: (v: T) => K
): (v1: T, v2: T) => number {
  return (value1, value2) => {
    const key1 = keyFunc(value1);
    const key2 = keyFunc(value2);
    for (let i = 0; i < key1.length; i++) {
      if (key1[i] < key2[i]) return -1;
      if (key1[i] > key2[i]) return 1;
    }
    return 0;
  };
}

export default function ReviewsView({
  filter,
  showReassign,
}: {
  filter: Record<string, string>;
  showReassign?: boolean;
}) {
  const [reviews, setReviews] = useState<PopulatedReview[]>([]);
  const { alerts, addAlert } = useAlerts();

  // TODO: audit all other useEffects to check dependency lists
  useEffect(() => {
    api
      .getFilteredReviews(filter)
      .then((newReviews) =>
        setReviews(
          newReviews
            .slice()
            .sort(
              makeComparator((r) => [
                r.stage.name,
                r.application.name,
                r.reviewerEmail || "",
                r._id,
              ])
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
              <th>Reviewer</th>
              <th>Status</th>
              {showReassign && <th>Reassign</th>}
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => {
              let status: string;
              if (review.completed) {
                status = "complete";
              } else {
                status = Object.keys(review.fields).length > 0 ? "draft" : "blank";
              }
              return (
                <tr key={review._id}>
                  <td>{review.stage.name}</td>
                  <td>
                    <a href={`/review/${review._id}/edit`}>{review.application.name}</a>
                  </td>
                  <td>
                    {review.reviewerEmail || (
                      <AutoAssignButton id={review._id} addAlert={addAlert} />
                    )}
                  </td>
                  <td>{status}</td>
                  {showReassign && (
                    <td>
                      {!review.completed && <ManualAssign id={review._id} addAlert={addAlert} />}
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
};
