import { useEffect, useState } from "react";
import { Alert, Table } from "react-bootstrap";

import api, { Application, PopulatedReview } from "../api";
import { useAlerts } from "../hooks";
import { makeComparator } from "../util";

const SCORE_REGEX = /^(.*_)?score$/;

export default function StageApplicationsView({ stageId }: { stageId: string }) {
  const [reviews, setReviews] = useState<PopulatedReview[]>([]);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api.getFilteredReviews({ stage: stageId }).then(setReviews).catch(addAlert);
  }, [stageId]);

  const scoreAlerts: string[] = [];
  const addScoreAlert = (alert: string) => scoreAlerts.push(alert);

  const grouped: Record<string, [Application, PopulatedReview[]]> = {};
  reviews.forEach((review) => {
    const appId = review.application._id;
    grouped[appId] = grouped[appId] || [review.application, []];
    grouped[appId][1].push(review);
  });

  let scoreKeys: string[];
  reviews.forEach((review) => {
    const currentScoreKeys = Object.keys(review.fields)
      .filter((k) => SCORE_REGEX.test(k))
      .sort();
    if (scoreKeys === undefined) {
      scoreKeys = currentScoreKeys;
    } else if (JSON.stringify(scoreKeys) !== JSON.stringify(currentScoreKeys)) {
      // ^^^ crummy way of checking array equality
      addScoreAlert(
        `Mismatched score fields - score calculation is probably incorrect! ${JSON.stringify(
          scoreKeys
        )}, ${JSON.stringify(currentScoreKeys)}`
      );
    }
  });

  // console.log({ scoreKeys });

  const withScores = Object.values(grouped).map(([app, appReviews]) => {
    const avgScore =
      appReviews
        .map((review) =>
          scoreKeys
            .map((scoreKey) => {
              const score = review.fields[scoreKey];
              if (typeof score !== "number") {
                addScoreAlert(
                  `Review ${review._id} field ${scoreKey}: expected number, got ${typeof score}`
                );
                return 0;
              }
              return score;
            })
            .reduce((a, b) => a + b, 0)
        )
        .reduce((a, b) => a + b, 0) / appReviews.length;
    return [app, appReviews, avgScore] as const;
  });

  withScores.sort(makeComparator(([app, _appReviews, avgScore]) => [avgScore, app.name]));

  return (
    <div>
      {withScores.length === 0 ? (
        "No applications to display."
      ) : (
        <Table>
          <thead>
            <tr>
              <td>Average Score</td>
              <td>Name</td>
              <td>Raw Data</td>
            </tr>
          </thead>
          <tbody>
            {withScores.map(([app, appReviews, score]) => (
              <tr key={app._id}>
                <td>{score}</td>
                <td>
                  <a href={`/application/${app._id}`}>{app.name}</a>
                </td>
                <td>
                  {appReviews.map((r) => (
                    <p key={r._id}>
                      {`${r.reviewerEmail || "(no reviewer assigned)"}: ${JSON.stringify(
                        Object.fromEntries(
                          Object.entries(r.fields).filter(([k, _v]) => SCORE_REGEX.test(k))
                        )
                      )}`}
                    </p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {alerts}
      {scoreAlerts.map((alert) => (
        <Alert>{alert}</Alert>
      ))}
    </div>
  );
}
