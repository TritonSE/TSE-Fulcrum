import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api";
import ApplicationHeader from "../components/ApplicationHeader";
import ScoreCard from "../components/ScoreCard";
import StageNotes from "../components/StageNotes";
import { useAlerts } from "../hooks/alerts";
import { makeComparator } from "../util";

import type { PopulatedReview } from "../api";

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

  const sortedReviews = reviews
    .slice()
    .sort(
      makeComparator((r) => [
        -r.stage.pipelineIndex,
        r.stage.pipelineIdentifier,
        r.stage.pipelineIndex,
        r.reviewerEmail || "",
      ]),
    );

  // Group reviews by stage
  const groupedReviews = sortedReviews.reduce(
    (acc, review) => {
      const key = review.stage.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(review);
      return acc;
    },
    {} as Record<string, PopulatedReview[]>,
  );

  // Get unique stage names
  const stages = Array.from(new Set(sortedReviews.map((r) => r.stage.name)));

  return (
    <div className="tw:flex tw:flex-col tw:gap-8">
      <ApplicationHeader applicationId={applicationId || ""} />
      <div className="tw:flex tw:flex-col tw:gap-7">
        {stages.map((stage) => {
          const reviewsInGroup = groupedReviews[stage];

          return (
            <div key={stage} className="tw:flex tw:flex-col tw:gap-3">
              <h2 className="tw:!text-2xl tw:!m-0 tw:!text-teal-primary tw:!font-bold">{stage}</h2>
              <div className="tw:flex tw:gap-15 tw:flex-wrap">
                {reviewsInGroup.map((r) => (
                  <ScoreCard key={r._id} review={r} />
                ))}
              </div>
              <StageNotes reviewsInStage={reviewsInGroup} />
            </div>
          );
        })}
      </div>
      {alerts}
    </div>
  );
}
