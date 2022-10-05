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

export default function ReviewsView({ filter }: { filter: Record<string, string> }) {
  const [reviews, setReviews] = useState<PopulatedReview[]>([]);
  const { alerts, addAlert } = useAlerts();

  // TODO: audit all other useEffects to check dependency lists
  useEffect(() => {
    api.getFilteredReviews(filter).then(setReviews).catch(addAlert);
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
