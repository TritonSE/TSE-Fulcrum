import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api, { PopulatedReview } from "../api";
import { useAlerts } from "../hooks";
import { makeComparator } from "../util";
import ApplicationView from "../views/ApplicationView";

import { ReviewView } from "./EditReview";

export default function ViewApplication() {
  const { applicationId } = useParams();
  const { alerts, addAlert } = useAlerts();

  const [reviews, setReviews] = useState<PopulatedReview[]>([]);
  useEffect(() => {
    api
      .getFilteredReviews({ application: applicationId || "" })
      .then(setReviews)
      .catch(addAlert);
  }, [applicationId]);

  return (
    <>
      <ApplicationView id={applicationId || ""} />
      {reviews
        .slice()
        .sort(
          makeComparator((r) => [r.stage.pipeline, r.stage.pipelineIndex, r.reviewerEmail || ""])
        )
        .map((r) => (
          <ReviewView key={r._id} id={r._id} showApplication={false} />
        ))}
      {alerts}
    </>
  );
}
