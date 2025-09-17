import { ColumnDef } from "@tanstack/react-table";
import { Button, LoadingSpinner, Table, TextField } from "@tritonse/tse-constellation";
import { useEffect, useState } from "react";

import api, { PopulatedReview } from "../api";
import { Variant } from "../components/Alert";
import { ApplicantInfoCell } from "../components/ApplicantInfoCell";
import { StatusChip } from "../components/StatusChip";
import { formatApplicantYear } from "../helpers/application";
import {
  getReviewStatus,
  getReviewStatusHumanReadable,
  reviewStatusColors,
} from "../helpers/review";
import { useAlerts } from "../hooks/alerts";
import { useUsers } from "../hooks/users";
import { makeComparator } from "../util";

function AutoAssignButton({
  id,
  addAlert,
  refreshReviews,
}: {
  id: string;
  addAlert: (message: unknown, variant?: Variant) => void;
  refreshReviews: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const onClick = () => {
    api
      .autoAssignReview(id)
      .then((review) => {
        addAlert(`Auto-assigned review to ${review.reviewerEmail}`, "success");
        setEnabled(false);
        refreshReviews();
      })
      .catch(addAlert);
  };
  return (
    <Button onClick={onClick} disabled={!enabled}>
      Auto-assign
    </Button>
  );
}

function ManualAssign({
  id,
  addAlert,
  refreshReviews,
}: {
  id: string;
  addAlert: (message: unknown, variant?: Variant) => void;
  refreshReviews: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [reviewerEmail, setReviewerEmail] = useState("");
  const onClick = () => {
    setEnabled(false);
    api
      .assignReview(id, reviewerEmail)
      .then((review) => {
        addAlert(`Assigned review to ${review.reviewerEmail}`, "success");
        refreshReviews();
      })
      .catch((e) => {
        addAlert(e);
        setEnabled(true);
      });
  };
  return (
    <div className="tw:flex tw:flex-col tw:gap-y-3">
      <TextField
        type="email"
        value={reviewerEmail}
        onChange={setReviewerEmail}
        disabled={!enabled}
        placeholder="Reviewer's email address"
      />
      <Button onClick={onClick} disabled={!enabled} className="tw:!flex tw:!justify-center">
        Reassign
      </Button>
    </div>
  );
}

export default function ReviewsView({ filter }: { filter: Record<string, string> }) {
  const [reviews, setReviews] = useState<PopulatedReview[] | null>(null);
  const { alerts, addAlert } = useAlerts();
  const { emailsToUsers } = useUsers();

  const loadReviews = () => {
    api
      .getFilteredReviews(filter)
      .then((newReviews) =>
        setReviews(
          newReviews
            .slice()
            .sort(
              makeComparator((r) => [
                r.stage.name,
                r.application.gradQuarter,
                r.application.name,
                r.reviewerEmail || "",
                r._id,
              ])
            )
        )
      )
      .catch(addAlert);
  };

  // TODO: audit all other useEffects to check dependency lists
  useEffect(loadReviews, [filter]);

  return (
    <div>
      {!reviews ? (
        <LoadingSpinner />
      ) : reviews.length === 0 ? (
        "No reviews to display."
      ) : (
        <Table
          className="reviews-table"
          columns={
            [
              {
                accessorKey: "stage.name",
                header: "Stage",
              },
              {
                cell: (cell) => (
                  <ApplicantInfoCell
                    application={cell.row.original.application}
                    linkDestination={`/application/${cell.row.original.application._id}`}
                  />
                ),
                header: "Applicant",
              },
              {
                accessorFn: (review) => formatApplicantYear(review.applicantYear),
                header: "Year",
              },
              {
                cell: (cell) => {
                  const review = cell.row.original;
                  const pastReviewers = Object.entries(
                    reviews
                      .filter((r) => review.application._id === r.application._id)
                      .map((r) => [
                        r.stage.name,
                        r.reviewerEmail
                          ? emailsToUsers[r.reviewerEmail]?.name ?? "(unknown user)"
                          : "(unassigned)",
                      ])
                      .reduce(
                        (o, [stage, reviewer]) => ({
                          ...o,
                          [stage]: [...(o[stage] || []), reviewer],
                        }),
                        {} as Record<string, string[]>
                      )
                  ).sort();
                  return pastReviewers.length === 0
                    ? "(none)"
                    : pastReviewers.map(([stage, reviewers]) => (
                        <p key={stage}>
                          <b>{stage}</b>: {reviewers.slice().sort().join(", ")}
                        </p>
                      ));
                },
                header: "Past Reviewers",
              },
              {
                cell: (cell) =>
                  cell.row.original.reviewerEmail ? (
                    emailsToUsers[cell.row.original.reviewerEmail]?.name ?? "(unknown user)"
                  ) : (
                    <AutoAssignButton
                      id={cell.row.original._id}
                      addAlert={addAlert}
                      refreshReviews={loadReviews}
                    />
                  ),
                header: "Reviewer",
              },
              {
                cell: (cell) => (
                  <StatusChip
                    color={reviewStatusColors[getReviewStatus(cell.row.original)]}
                    text={getReviewStatusHumanReadable(cell.row.original)}
                  />
                ),
                header: "Status",
              },
              {
                cell: (cell) => (
                  <ManualAssign
                    id={cell.row.original._id}
                    addAlert={addAlert}
                    refreshReviews={loadReviews}
                  />
                ),
                header: "Reassign",
              },
            ] as ColumnDef<PopulatedReview>[]
          }
          data={reviews}
          enablePagination={false}
          enableGlobalFiltering={false}
          actionElement={false}
        />
      )}
      {alerts}
    </div>
  );
}
