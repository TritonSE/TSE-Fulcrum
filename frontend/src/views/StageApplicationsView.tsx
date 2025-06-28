import { useEffect, useState } from "react";
import { Alert, Button, Form, Table } from "react-bootstrap";

import api, { Application, PopulatedReview, Progress, Stage } from "../api";
import { useAlerts } from "../hooks";
import { makeComparator, formatQuarter } from "../util";

const SCORE_REGEX = /^(.*_)?score$/;
const RATING_REGEX = /^(.*_)?rating$/;

function AdvanceButton({
  progressId,
  addAlert,
  onAdvanced,
}: {
  progressId: string;
  addAlert: (message: unknown) => void;
  onAdvanced: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const onClick = () => {
    api
      .advanceApplication(progressId)
      .then(() => {
        setEnabled(false);
        onAdvanced();
      })
      .catch(addAlert);
  };
  return (
    <Button variant="success" onClick={onClick} disabled={!enabled}>
      Advance
    </Button>
  );
}

function RejectButton({
  progressId,
  addAlert,
  onRejected,
}: {
  progressId: string;
  addAlert: (message: unknown) => void;
  onRejected: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const onClick = () => {
    api
      .rejectApplication(progressId)
      .then(() => {
        setEnabled(false);
        onRejected();
      })
      .catch(addAlert);
  };
  return (
    <Button variant="danger" onClick={onClick} disabled={!enabled}>
      Reject
    </Button>
  );
}

export default function StageApplicationsView({ stageId }: { stageId: string }) {
  const [progresses, setProgresses] = useState<Progress[]>([]);
  const [reviews, setReviews] = useState<PopulatedReview[]>([]);
  const [selectedAction, setSelectedAction] = useState("none");
  const [stage, setStage] = useState<Stage | null>(null);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api.getFilteredReviews({ stage: stageId }).then(setReviews).catch(addAlert);
  }, [stageId]);

  useEffect(() => {
    api
      .getStageById(stageId)
      .then((newStage) => {
        setStage(newStage);
        api
          .getFilteredProgresses({ pipeline: newStage.pipeline })
          .then(setProgresses)
          .catch(addAlert);
      })
      .catch(addAlert);
  }, [stageId]);

  const scoreAlerts: string[] = [];
  const addScoreAlert = (alert: string) => scoreAlerts.push(alert);

  const grouped: Record<string, [Application, PopulatedReview[]]> = {};
  reviews.forEach((review) => {
    const appId = review.application._id;
    grouped[appId] = grouped[appId] || [review.application, []];
    grouped[appId][1].push(review);
  });

  const isComplete = (review: PopulatedReview) => Object.keys(review.fields).length !== 0;

  let scoreKeys: string[] = [];
  reviews.filter(isComplete).forEach((review) => {
    const currentScoreKeys = Object.keys(review.fields)
      .filter((k) => SCORE_REGEX.test(k))
      .sort();
    if (scoreKeys.length === 0) {
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

  const withScores = Object.values(grouped).map(([app, appReviews]) => {
    const avgScore =
      appReviews
        .filter(isComplete)
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
              return score * (stage?.fields[scoreKey]?.weight ?? 1);
            })
            .reduce((a, b) => a + b, 0)
        )
        .reduce((a, b) => a + b, 0) / appReviews.length;
    return [app, appReviews, avgScore] as const;
  });

  withScores.sort(makeComparator(([app, _appReviews, avgScore]) => [-avgScore, app.name]));

  const progressesByApplication = Object.fromEntries(progresses.map((p) => [p.application, p]));

  return (
    <div>
      {stage && <h2>{stage.name}</h2>}
      {scoreAlerts.map((alert) => (
        <Alert variant="danger">{alert}</Alert>
      ))}
      {withScores.length === 0 ? (
        "No applications to display."
      ) : (
        <Table>
          <thead>
            <tr>
              <td>Row</td>
              <td>Average Score</td>
              <td>Name</td>
              <td>Pronouns</td>
              <td>Degree Timeline</td>
              <td>Review Status</td>
              <td>
                Select action:
                <Form.Select
                  style={{ width: "10em" }}
                  onChange={(e) => setSelectedAction(e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="advance">Advance</option>
                  <option value="reject">Reject</option>
                </Form.Select>
              </td>
              <td>Application Status</td>
              <td>Raw Data</td>
              <td>Ratings</td>
              <td>Max Score Difference</td>
            </tr>
          </thead>
          <tbody>
            {withScores.map(([app, appReviews, score], i) => {
              const incompleteCount = appReviews.filter((r) => !isComplete(r)).length;
              const allComplete = incompleteCount === 0;

              const progress: Progress | undefined = progressesByApplication[app._id];
              let progressMessage: string;
              let pendingAtThisStage = false;
              if (progress === undefined) {
                progressMessage = `error: no progress for application ${app._id} and pipeline ${stage?.pipeline}`;
              } else if (!stage) {
                progressMessage = "waiting for stage to load...";
              } else {
                const progressIndex = progress.stageIndex;
                const stageIndex = stage.pipelineIndex;
                let stageDescription;
                if (progressIndex < stageIndex) {
                  stageDescription =
                    "at earlier stage (ERROR: why do reviews exist for this stage then?)";
                } else if (progressIndex === stageIndex) {
                  stageDescription = "at this stage";
                  if (progress.state === "pending") {
                    pendingAtThisStage = true;
                  }
                } else {
                  stageDescription = "at later stage";
                }
                progressMessage = `${progress.state} ${stageDescription}`;
              }

              const onAdvanced = () =>
                addAlert(`Advanced ${app.name}'s application to the next stage.`, "success");
              const onRejected = () => addAlert(`Rejected ${app.name}'s application`, "info");

              return (
                <tr key={app._id}>
                  <td>{i + 1}</td>
                  <td>{score}</td>
                  <td>
                    <a href={`/application/${app._id}`}>{app.name}</a>
                  </td>
                  <td>{app.pronouns}</td>
                  <td>{`${formatQuarter(app.startQuarter)} to ${formatQuarter(
                    app.gradQuarter
                  )}`}</td>
                  <td>{allComplete ? "all completed" : `${incompleteCount} incomplete`}</td>
                  <td>
                    {pendingAtThisStage ? (
                      <>
                        {selectedAction === "advance" && (
                          <AdvanceButton
                            progressId={progress._id}
                            addAlert={addAlert}
                            onAdvanced={onAdvanced}
                          />
                        )}
                        {selectedAction === "reject" && (
                          <RejectButton
                            progressId={progress._id}
                            addAlert={addAlert}
                            onRejected={onRejected}
                          />
                        )}
                        {selectedAction === "none" && "(no action selected)"}
                      </>
                    ) : (
                      "(unavailable)"
                    )}
                  </td>
                  <td>{progressMessage}</td>
                  <td>
                    {appReviews.map((r) => (
                      <p key={r._id}>
                        {`${r.reviewerEmail || "(no reviewer assigned)"}${
                          isComplete(r) ? "" : " (incomplete)"
                        }: ${JSON.stringify(
                          Object.fromEntries(
                            Object.entries(r.fields)
                              .filter(([k, _v]) => SCORE_REGEX.test(k))
                              .sort(makeComparator(([k, _v]) => [k]))
                          )
                        )}`}
                      </p>
                    ))}
                  </td>
                  <td>
                    {appReviews.map((r) => (
                      <p key={r._id}>
                        {`${r.reviewerEmail || "(no reviewer assigned)"}${
                          isComplete(r) ? "" : " (incomplete)"
                        }: ${JSON.stringify(
                          Object.fromEntries(
                            Object.entries(r.fields)
                              .filter(([k, _v]) => RATING_REGEX.test(k))
                              .sort(makeComparator(([k, _v]) => [k]))
                          )
                        )}`}
                      </p>
                    ))}
                  </td>
                  <td>
                    {scoreKeys
                      .map((scoreKey) => {
                        const scores = appReviews
                          .map((r) => r.fields[scoreKey])
                          .map((s) => (typeof s === "number" ? s : 0));
                        return Math.max(...scores) - Math.min(...scores);
                      })
                      .reduce((a, b) => Math.max(a, b), 0)}
                  </td>
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
