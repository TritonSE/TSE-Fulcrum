import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Table } from "react-bootstrap";

import api, {
  Application,
  BulkAdvanceOrRejectResponse,
  PopulatedReview,
  Progress,
  Stage,
} from "../api";
import { useAlerts } from "../hooks";
import { makeComparator, formatQuarter } from "../util";

const SCORE_REGEX = /^(.*_)?score$/;
const RATING_REGEX = /^(.*_)?rating$/;

function AdvanceButton({
  pipelineId,
  applicationIds,
  addAlert,
  onAdvanced,
}: {
  pipelineId: string;
  applicationIds: string[];
  addAlert: (message: unknown) => void;
  onAdvanced: (response: BulkAdvanceOrRejectResponse) => void;
}) {
  const onClick = () => {
    api.bulkAdvanceApplications(pipelineId, applicationIds).then(onAdvanced).catch(addAlert);
  };
  return (
    <Button variant="success" onClick={onClick}>
      Advance
    </Button>
  );
}

function RejectButton({
  pipelineId,
  applicationIds,
  addAlert,
  onRejected,
}: {
  pipelineId: string;
  applicationIds: string[];
  addAlert: (message: unknown) => void;
  onRejected: (response: BulkAdvanceOrRejectResponse) => void;
}) {
  const onClick = () => {
    api.bulkRejectApplications(pipelineId, applicationIds).then(onRejected).catch(addAlert);
  };
  return (
    <Button variant="danger" onClick={onClick}>
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
  // Map of applicationIds to whether the checkbox for that application is selected
  const [checkboxesSelectedMap, setCheckboxesSelectedMap] = useState<Record<string, boolean>>({});
  // List of selected applicationIds
  const selectedApplications = useMemo(
    () =>
      Object.keys(checkboxesSelectedMap).filter(
        (applicationId) => checkboxesSelectedMap[applicationId]
      ),
    [checkboxesSelectedMap]
  );

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

  let scoreKeys: string[] = [];
  reviews
    .filter((r) => r.completed)
    .forEach((review) => {
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
        .filter((r) => r.completed)
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
                {selectedAction === "advance" && !!stage && (
                  <AdvanceButton
                    pipelineId={stage.pipeline}
                    applicationIds={selectedApplications}
                    addAlert={addAlert}
                    onAdvanced={(response) => {
                      setCheckboxesSelectedMap({});
                      let successCount = 0;
                      Object.keys(response).forEach((applicationId) => {
                        if (response[applicationId].success) {
                          successCount++;
                        } else {
                          addAlert(
                            `Failed to advance applicant ${grouped[applicationId][0].name}: ${response[applicationId].value}`
                          );
                        }
                      });

                      addAlert(`Successfully advanced ${successCount} applicants!`, "success");
                    }}
                  />
                )}
                {selectedAction === "reject" && !!stage && (
                  <RejectButton
                    pipelineId={stage.pipeline}
                    applicationIds={selectedApplications}
                    addAlert={addAlert}
                    onRejected={(response) => {
                      setCheckboxesSelectedMap({});
                      let successCount = 0;

                      Object.keys(response).forEach((applicationId) => {
                        if (response[applicationId].success) {
                          successCount++;
                        } else {
                          addAlert(
                            `Failed to reject applicant ${grouped[applicationId][0].name}: ${response[applicationId].value}`
                          );
                        }
                      });
                      addAlert(`Successfully rejected ${successCount} applicants!`, "success");
                    }}
                  />
                )}
              </td>
              <td>Application Status</td>
              <td>Raw Data</td>
              <td>Ratings</td>
              <td>Max Score Difference</td>
            </tr>
          </thead>
          <tbody>
            {withScores.map(([app, appReviews, score], i) => {
              const incompleteCount = appReviews.filter((r) => !r.completed).length;
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
                    {pendingAtThisStage && allComplete ? (
                      <>
                        {selectedAction === "advance" || selectedAction === "reject" ? (
                          <Form.Check
                            type="checkbox"
                            checked={checkboxesSelectedMap[app._id] ?? false}
                            onChange={(e) =>
                              setCheckboxesSelectedMap({
                                ...checkboxesSelectedMap,
                                [app._id]: e.target.checked,
                              })
                            }
                            style={{ display: "flex" }}
                          />
                        ) : null}
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
                          r.completed ? "" : " (incomplete)"
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
                          r.completed ? "" : " (incomplete)"
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
