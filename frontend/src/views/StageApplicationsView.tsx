import { Button, Checkbox, LoadingSpinner, Modal, Table } from "@tritonse/tse-constellation";
import { use, useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";

import api from "../api";
import Alert from "../components/Alert";
import { ApplicantInfoCell } from "../components/ApplicantInfoCell";
import { StatusChip } from "../components/StatusChip";
import { GlobalContext } from "../context/GlobalContext";
import {
  APPLICANT_YEARS,
  applicationStatusColors,
  formatApplicantYear,
  getApplicationStageStatus,
  toTitleCase,
} from "../helpers/application";
import {
  formatFieldNameHumanReadable,
  getReviewStatus,
  getReviewStatusHumanReadable,
  ReviewStatus,
  reviewStatusColors,
} from "../helpers/review";
import { useAlerts } from "../hooks/alerts";
import { useUsers } from "../hooks/users";
import { makeComparator } from "../util";

import type { Application, PopulatedReview, Progress, Stage } from "../api";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";

const SCORE_REGEX = /^(?:.*_)?score$/;
const RATING_REGEX = /^(?:.*_)?rating$/;

export default function StageApplicationsView({ stageId }: { stageId: number }) {
  const { user } = use(GlobalContext);
  const [progresses, setProgresses] = useState<Progress[]>([]);
  const [reviews, setReviews] = useState<PopulatedReview[]>([]);
  const [stage, setStage] = useState<Stage | null>(null);
  const { alerts, addAlert } = useAlerts();
  const { emailsToUsers } = useUsers();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [modalState, setModalState] = useState<"advance" | "reject" | null>(null);
  const [showingYearFilter, setShowingYearFilter] = useState(false);
  const [yearsAreSelected, setYearsAreSelected] = useState(
    Object.fromEntries(APPLICANT_YEARS.map((year) => [year, false])),
  );
  const selectedYears = useMemo(
    () => Object.keys(yearsAreSelected).filter((year) => yearsAreSelected[year]),
    [yearsAreSelected],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .getFilteredReviews({ stageId: stageId.toString() })
      .then((newReviews) => {
        // In-memory filter - applicant year is computed anyway. Can optimize this if it's too slow with hundreds of applicants
        if (selectedYears.length === 0) {
          setReviews(newReviews);
        } else {
          setReviews(
            newReviews.filter((review) =>
              selectedYears.includes(formatApplicantYear(review.applicantYear)),
            ),
          );
        }

        // Reset checkbox state since some rows may disappear after filtering
        setRowSelection({});
      })
      .catch(addAlert);
  }, [stageId, selectedYears]);

  useEffect(() => {
    api
      .getStageById(stageId)
      .then((newStage) => {
        setStage(newStage);
      })
      .catch(addAlert);
  }, [stageId]);

  const loadProgresses = () => {
    if (!stage) {
      return;
    }

    api
      .getFilteredProgresses({ pipelineIdentifier: stage.pipelineIdentifier })
      .then(setProgresses)
      .catch(addAlert);
  };

  useEffect(loadProgresses, [stage]);

  const grouped: Record<string, [Application, PopulatedReview[]]> = {};
  reviews.forEach((review) => {
    const appId = review.application._id;
    grouped[appId] = grouped[appId] || [review.application, []];
    grouped[appId][1].push(review);
  });

  const isComplete = (review: PopulatedReview) =>
    getReviewStatus(review) === ReviewStatus.Completed;

  let scoreKeys: string[] = [];
  reviews.filter(isComplete).forEach((review) => {
    const currentScoreKeys = Object.keys(review.fields)
      .filter((k) => SCORE_REGEX.test(k))
      .sort();
    if (scoreKeys.length === 0) {
      scoreKeys = currentScoreKeys;
    } else if (JSON.stringify(scoreKeys) !== JSON.stringify(currentScoreKeys)) {
      // ^^^ crummy way of checking array equality
      addAlert(
        `Mismatched score fields - score calculation is probably incorrect! ${JSON.stringify(
          scoreKeys,
        )}, ${JSON.stringify(currentScoreKeys)}`,
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
                addAlert(
                  `Review ${review._id} field ${scoreKey}: expected number, got ${typeof score}`,
                );
                return 0;
              }
              return score * (stage?.fields[scoreKey]?.weight ?? 1);
            })
            .reduce((a, b) => a + b, 0),
        )
        .reduce((a, b) => a + b, 0) / appReviews.length;
    return [app, appReviews, avgScore] as const;
  });

  withScores.sort(makeComparator(([app, _appReviews, avgScore]) => [-avgScore, app.name]));

  const progressesByApplication = Object.fromEntries(progresses.map((p) => [p.application, p]));

  const selectedApplicationIds = Object.keys(rowSelection).filter((row) => rowSelection[row]);

  const titleText = stage ? `${stage.name}${withScores ? ` (${withScores.length})` : null}` : "";

  const onConfirmAdvanceReject = async () => {
    setLoading(true);
    try {
      if (!stage) {
        addAlert("Stage not loaded");
        return;
      }

      let response;
      if (modalState === "advance") {
        response = await api.bulkAdvanceApplications(
          stage.pipelineIdentifier,
          selectedApplicationIds,
        );
      } else if (modalState === "reject") {
        response = await api.bulkRejectApplications(
          stage.pipelineIdentifier,
          selectedApplicationIds,
        );
      } else {
        addAlert(`Unknown action: ${modalState}`);
        return;
      }

      let successCount = 0;

      Object.keys(response).forEach((applicationId) => {
        if (response[applicationId].success) {
          successCount++;
        } else {
          addAlert(
            `Failed to ${modalState} applicant ${grouped[applicationId][0].name}: ${response[applicationId].value}`,
          );
        }
      });
      addAlert(`Successfully ${modalState}ed ${successCount} applicants!`, "success");
      loadProgresses();
    } catch (error) {
      addAlert(error);
    } finally {
      setRowSelection({});
      setModalState(null);
      setLoading(false);
    }
  };

  const actionsDisabled = loading || !user?.isAdmin || selectedApplicationIds.length === 0;

  return (
    <>
      {!user?.isAdmin && (
        <Alert className="tw:w-full" variant="info">
          Only admins can advance or reject applicants.
        </Alert>
      )}
      <div className="tw:flex tw:flex-row tw:justify-between tw:mb-8">
        <h2>{titleText}</h2>
        <div className="tw:flex tw:flex-row tw:gap-x-5 tw:align-center">
          <p className="tw:!m-auto">{selectedApplicationIds.length} selected</p>
          <Button
            disabled={actionsDisabled}
            onClick={() => setModalState("advance")}
            className={twMerge(
              "tw:!px-3 tw:!rounded-lg tw:!bg-green-700",
              actionsDisabled && "tw:opacity-60",
            )}
          >
            Advance
          </Button>
          <Button
            disabled={actionsDisabled}
            onClick={() => setModalState("reject")}
            className={twMerge(
              "tw:!px-3 tw:!rounded-lg tw:!bg-red-600",
              actionsDisabled && "tw:opacity-60",
            )}
          >
            Reject
          </Button>
        </div>
      </div>

      <Table
        className="reviews-table"
        columns={
          [
            {
              cell: (cell) => cell.row.index + 1,
              header: "#",
            },
            {
              cell: (cell) =>
                progressesByApplication[cell.row.original[0]._id] && stage ? (
                  <StatusChip
                    color={
                      applicationStatusColors[
                        getApplicationStageStatus(
                          stage,
                          progressesByApplication[cell.row.original[0]._id],
                        )
                      ]
                    }
                    text={toTitleCase(
                      getApplicationStageStatus(
                        stage,
                        progressesByApplication[cell.row.original[0]._id],
                      ),
                    )}
                  />
                ) : (
                  <LoadingSpinner />
                ),
              header: "Status",
            },
            {
              accessorFn: ([_, __, score]) => score,
              header: "Avg Score",
            },
            {
              cell: (cell) => (
                <ApplicantInfoCell
                  application={cell.row.original[0]}
                  linkDestination={`/application/${cell.row.original[0]._id}`}
                />
              ),
              header: "Applicant",
            },
            {
              accessorFn: ([_, appReviews]) =>
                // Guaranteed at least 1 review per applicant (otherwise they wouldn't show up in table)
                formatApplicantYear(appReviews[0].applicantYear),
              header: () => (
                <div className="tw:flex tw:flex-col tw:gap-y-1">
                  <div className="tw:flex tw:flex-row tw:gap-x-3 tw:align-center">
                    <p className="tw:!m-auto">Year</p>
                    <Button
                      onClick={() => setShowingYearFilter(!showingYearFilter)}
                      className="tw:!px-3 tw:!py-2 tw:!rounded-lg tw:!bg-blue-600"
                    >
                      {showingYearFilter ? "Hide" : "Show"} Filter
                    </Button>
                  </div>
                  {showingYearFilter &&
                    APPLICANT_YEARS.map((year) => (
                      <Checkbox
                        key={year}
                        checked={yearsAreSelected[year]}
                        onChange={(checked) =>
                          setYearsAreSelected({ ...yearsAreSelected, [year]: checked })
                        }
                        id={year}
                        label={year}
                      />
                    ))}
                </div>
              ),
              id: "year",
            },
            {
              cell: (cell) => (
                <div className="tw:flex tw:flex-col tw:gap-y-4 tw:justify-between">
                  {cell.row.original[1].map((review) =>
                    review.reviewerEmail ? (
                      Object.keys(emailsToUsers).length > 0 ? (
                        <p key={review._id} className="tw:!m-0 tw:font-bold">
                          {emailsToUsers[review.reviewerEmail]?.name}
                        </p>
                      ) : (
                        <LoadingSpinner key={review._id} />
                      )
                    ) : (
                      <p className="tw:!m-0" key={review._id}>
                        (unassigned)
                      </p>
                    ),
                  )}
                </div>
              ),
              header: "Reviewers",
            },
            {
              cell: (cell) => (
                <div className="tw:flex tw:flex-col tw:gap-y-4">
                  {cell.row.original[1].map((review) =>
                    review.reviewerEmail ? (
                      getReviewStatus(review) === ReviewStatus.Completed ? (
                        <div key={review._id} className="tw:flex tw:flex-col tw:gap-y-2">
                          {Object.entries(review.fields)
                            .filter(
                              ([fieldName]) =>
                                SCORE_REGEX.test(fieldName) || RATING_REGEX.test(fieldName),
                            )
                            .sort(makeComparator(([k, _v]) => [k]))
                            .map(([fieldName, fieldValue]) => (
                              <p key={fieldName} className="tw:!m-0 tw:whitespace-nowrap">
                                {formatFieldNameHumanReadable(fieldName)}: {fieldValue ?? 0}
                              </p>
                            ))}
                        </div>
                      ) : (
                        <StatusChip
                          key={review._id}
                          color={reviewStatusColors[getReviewStatus(review)]}
                          text={getReviewStatusHumanReadable(review)}
                        />
                      )
                    ) : null,
                  )}
                </div>
              ),
              header: "Scores",
            },
            {
              accessorFn: ([_, appReviews]) =>
                scoreKeys
                  .map((scoreKey) => {
                    const scores = appReviews
                      .map((r) => r.fields[scoreKey])
                      .map((s) => (typeof s === "number" ? s : 0));
                    return Math.max(...scores) - Math.min(...scores);
                  })
                  .reduce((a, b) => Math.max(a, b), 0),
              header: "Max Score Diff",
            },
          ] as ColumnDef<(typeof withScores)[number]>[]
        }
        data={withScores}
        enablePagination={false}
        enableGlobalFiltering={false}
        enableSorting={false}
        enableRowSelection={(row) =>
          user!.isAdmin &&
          !!stage &&
          !!progressesByApplication[row.original[0]._id] &&
          getApplicationStageStatus(stage, progressesByApplication[row.original[0]._id]) ===
            "pending"
        }
        enableMultiRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={([application]) => application._id}
      />
      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title="Are you sure?"
        content={
          <>
            <p>
              Are you sure you want to {modalState} {selectedApplicationIds.length} applicant(s)?
            </p>
            <p>
              {modalState === "advance"
                ? "This WILL NOT automatically email those candidates; we manually send emails to let them know they advanced & schedule the phone screen/technical interview"
                : modalState === "reject"
                  ? "This WILL automatically send rejection emails to these candidates."
                  : ""}
            </p>
          </>
        }
        primaryActionComponent={
          <Button onClick={() => void onConfirmAdvanceReject()}>Yes, {modalState}!</Button>
        }
        secondaryActionComponent={
          <Button onClick={() => setModalState(null)} variant="secondary">
            Cancel
          </Button>
        }
        withDividers={false}
      />
      {alerts}
    </>
  );
}
