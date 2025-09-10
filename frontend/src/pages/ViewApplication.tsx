import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api, { PopulatedReview } from "../api";
import ApplicationHeader from "../components/ApplicationHeader";
import { useAlerts } from "../hooks/alerts";
import { makeComparator } from "../util";

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
    <div className="tw:flex tw:flex-col tw:gap-8">
      <ApplicationHeader applicationId={applicationId || ""} />
      {reviews
        .slice()
        .sort(
          makeComparator((r) => [
            r.stage.pipelineIdentifier,
            r.stage.pipelineIndex,
            r.reviewerEmail || "",
          ])
        )
        .map((r) => (
          <ReviewView key={r._id} id={r._id} showApplication={false} />
        ))}
      {alerts}
    </div>
  );
}
