import { Link } from "react-router-dom";

import { PopulatedReview } from "../api";
import { formatFieldNameHumanReadable } from "../helpers/review";
import { useUsers } from "../hooks/users";

interface ScoreCardProps {
  review: PopulatedReview;
}

export default function ScoreCard({ review }: ScoreCardProps) {
  const { emailsToUsers } = useUsers();

  // Each field in this array is [fieldName, fieldValue, maxValue, rubricLink]
  const scoreAndRatingFields = Object.entries(review.stage.fields || {})
    .filter(([key, _]) => key.includes("score") || key.includes("rating"))
    .map(([key, _]) => [
      key,
      review.fields[key],
      review.stage.fields[key].maxValue,
      review.stage.fields[key].rubricLink,
    ]);

  return (
    <div className="tw:flex tw:flex-col tw:rounded-lg tw:overflow-hidden tw:min-w-90 tw:border tw:border-teal-primary">
      <div className="tw:bg-accent tw:p-2.5 tw:text-white tw:flex tw:justify-between tw:items-center">
        <span>
          {review.reviewerEmail
            ? emailsToUsers[review.reviewerEmail]?.name ?? "(unknown user)"
            : "(unassigned)"}
        </span>
        <Link to={`/review/${review._id}/edit`} className="tw:!text-white tw:underline">
          View
        </Link>
      </div>
      <div className="tw:rounded-b-lg tw:border-t tw:border-teal-primary tw:p-5">
        <div
          className={`tw:grid tw:gap-5 tw:content-center tw:items-center ${
            scoreAndRatingFields.length === 1 ? "tw:grid-cols-1" : "tw:grid-cols-2"
          }`}
        >
          {scoreAndRatingFields.map(([field, value, maxValue, rubricLink]) => (
            <div
              className="tw:flex tw:flex-col tw:gap-3 tw:items-center tw:text-teal-primary"
              key={`${review.stage.name}-${field}`}
            >
              <span className="tw:flex tw:gap-1 tw:items-center">
                {formatFieldNameHumanReadable(field as string)}
                {rubricLink && (
                  <a href={rubricLink as string} rel="noopener noreferrer" target="_blank">
                    (rubric)
                  </a>
                )}
              </span>
              <span className="tw:text-3xl">
                {value ?? "-"}
                {maxValue && `/${maxValue}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
