import { use, useEffect, useState } from "react";

import api from "../api";
import YourReviewsTable from "../components/YourReviewsTable";
import { GlobalContext } from "../context/GlobalContext";
import { getReviewStatus, reviewStatusNumericValues } from "../helpers/review";
import { useAlerts } from "../hooks/alerts";
import { makeComparator } from "../util";

import type { PopulatedReview, Stage } from "../api";

export default function Home() {
  const { user } = use(GlobalContext);

  const [stagesAndReviews, setStagesAndReviews] = useState<[Stage, PopulatedReview[]][]>([]);
  const { alerts, addAlert } = useAlerts();

  const loadReviews = () => {
    if (!user?.email) {
      return;
    }

    api
      .getFilteredReviews({ reviewerEmail: user?.email })
      .then((newReviews) => {
        const sortedReviews = newReviews.slice().sort(
          makeComparator((r) => [
            // Sort from latest to earliest pipelineIndex so we get most recent stage first
            -r.stage.pipelineIndex,
            reviewStatusNumericValues[getReviewStatus(r)],
            r.application.gradQuarter,
            r.application.name,
            r.reviewerEmail || "",
            r._id,
          ]),
        );

        // Group reviews by stage so we can display one table per stage
        setStagesAndReviews(
          sortedReviews.reduce(
            (acc, r) => {
              if (acc.length === 0 || r.stageId !== acc.at(-1)?.[0].id) {
                acc.push([r.stage, []]);
              }
              acc.at(-1)?.[1].push(r);
              return acc;
            },
            [] as [Stage, PopulatedReview[]][],
          ),
        );
      })
      .catch(addAlert);
  };

  useEffect(loadReviews, [user?.email]);

  useEffect(() => {
    document.title = "TSE Fulcrum - Home";
  }, []);

  return (
    <div className="tw:flex tw:flex-col tw:gap-y-12 tw:px-12">
      <h1 className="tw:!font-bold">Your Reviews</h1>
      {stagesAndReviews.map(([stage, reviews]) => (
        <YourReviewsTable
          key={stage.id}
          stage={stage}
          reviews={reviews}
          reloadReviews={loadReviews}
        />
      ))}
      {alerts}
    </div>
  );
}
