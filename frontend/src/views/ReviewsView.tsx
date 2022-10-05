import { useEffect, useState } from "react";
import { Button, Table } from "react-bootstrap";

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
        addAlert(`Assigned review to ${review.reviewerEmail}`, "success");
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

export default function ReviewsView({ filter }: { filter: Record<string, string> }) {
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
          <tr>
            <th>Stage</th>
            <th>Name</th>
            <th>Reviewer</th>
          </tr>
          {reviews.map((review) => (
            <tr key={review._id}>
              <td>{review.stage.name}</td>
              <td>
                <a href={`/review/${review._id}/edit`}>{review.application.name}</a>
              </td>
              <td>
                {/* TODO: figure out why the button styling is broken when put in a table */}
                {review.reviewerEmail || <AutoAssignButton id={review._id} addAlert={addAlert} />}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {alerts}
    </div>
  );
}
