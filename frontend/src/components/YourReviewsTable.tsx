import { ColumnDef } from "@tanstack/react-table";
import { Button, Modal, Table } from "@tritonse/tse-constellation";
import { useMemo, useState } from "react";

import api, { PopulatedReview, Stage } from "../api";
import { formatApplicantYear } from "../helpers/application";
import {
  getReviewStatus,
  getReviewStatusHumanReadable,
  ReviewStatus,
  reviewStatusColors,
  reviewStatusHumanReadableNames,
} from "../helpers/review";
import { useAlerts } from "../hooks/alerts";
import { formatQuarter } from "../util";

import { ApplicantInfoCell } from "./ApplicantInfoCell";
import { StatusChip } from "./StatusChip";

interface YourReviewsTableProps {
  stage: Stage;
  reviews: PopulatedReview[];
  reloadReviews: () => unknown;
}

/**
 * Displays your assigned reviews for a given stage
 */
function YourReviewsTable({ stage, reviews, reloadReviews }: YourReviewsTableProps) {
  const { alerts, addAlert } = useAlerts();
  const [reassigningReview, setReassigningReview] = useState<PopulatedReview | null>(null);

  const reassignReview = () => {
    if (reassigningReview === null) {
      addAlert("Review not loaded; cannot reassign");
      return;
    }

    api
      .reassignReview(reassigningReview._id)
      .then(() => {
        setReassigningReview(null);
        addAlert("Review reassigned successfully", "success");
        reloadReviews();
      })
      .catch(addAlert)
      .finally(() => setReassigningReview(null));
  };

  const countsText = useMemo(() => {
    const statusCounts: string[] = [];

    Object.values(ReviewStatus).forEach((status) => {
      const reviewsOfStatus = reviews.filter((r) => getReviewStatus(r) === status);
      if (reviewsOfStatus.length > 0) {
        statusCounts.push(
          `${reviewsOfStatus.length} ${reviewStatusHumanReadableNames[
            status as ReviewStatus
          ].toLowerCase()}`
        );
      }
    });

    return `${reviews.length} total: ${statusCounts.join(", ")}`;
  }, [stage, reviews]);

  return (
    <div className="tw:flex tw:flex-col tw:gap-y-0">
      <h3 className="tw:!font-bold">{stage.name}</h3>
      <p>{countsText}</p>
      <Table
        className="reviews-table"
        columns={
          [
            {
              cell: (cell) => (
                <ApplicantInfoCell
                  application={cell.row.original.application}
                  linkDestination={`/review/${cell.row.original._id}/edit`}
                />
              ),
              header: "Applicant",
            },
            {
              accessorFn: (review) => formatApplicantYear(review.applicantYear),
              header: "Year",
            },
            {
              accessorFn: (review) => formatQuarter(review.application.startQuarter),
              header: "Start Quarter",
            },
            {
              accessorFn: (review) => formatQuarter(review.application.gradQuarter),
              header: "Grad Quarter",
            },
            {
              cell: (cell) => (
                <Button onClick={() => setReassigningReview(cell.row.original)} destructive>
                  Reassign
                </Button>
              ),
              header: "Actions",
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
          ] as ColumnDef<PopulatedReview>[]
        }
        data={reviews}
        enablePagination={false}
        enableGlobalFiltering={false}
        actionElement={false}
      />

      <Modal
        isOpen={reassigningReview !== null}
        onClose={() => setReassigningReview(null)}
        title="Are you sure?"
        content={`Are you sure you want to reassign ${reassigningReview?.application.name} to another reviewer?`}
        primaryActionComponent={<Button onClick={() => reassignReview()}>Yes, reassign!</Button>}
        secondaryActionComponent={
          <Button onClick={() => setReassigningReview(null)} variant="secondary">
            Cancel
          </Button>
        }
        withDividers={false}
      />
      {alerts}
    </div>
  );
}

export default YourReviewsTable;
