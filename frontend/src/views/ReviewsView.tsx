import { useEffect, useState } from "react";
import { Table } from "react-bootstrap";

import api, { PopulatedReview } from "../api";
import { useAlerts } from "../hooks";

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
        "You have no pending reviews."
      ) : (
        <Table>
          <tr>
            <th>Stage</th>
            <th>Name</th>
          </tr>
          {reviews.map((review) => (
            <tr key={review._id}>
              <td>{review.stage.name}</td>
              <td>
                <a href={`/review/${review._id}/edit`}>{review.application.name}</a>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {alerts}
    </div>
  );
}
