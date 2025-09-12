import { Application, PopulatedReview } from "../api";
import { formatFieldNameHumanReadable } from "../helpers/review";

interface StageNotesProps {
  reviewsInStage: PopulatedReview[];
}

/* Lists notes from all reviewers */
export default function StageNotes({ reviewsInStage: reviews }: StageNotesProps) {
  const notesFields = reviews.flatMap((r) =>
    Object.entries(r.fields)
      .filter(([key, _]) => key.includes("notes"))
      .map(([key, value]) => [key, value, r.reviewerEmail] as [string, string, string])
  );

  if (notesFields.length === 0) return null;

  return (
    <div className="tw:bg-cream-primary tw:p-6 tw:rounded-lg">
      <h3 className="tw:!m-0 tw:!mb-2 tw:!text-teal-primary tw:!text-xl">Notes: </h3>
      <div className="tw:flex tw:flex-col tw:gap-3">
        {notesFields.map(([key, value, email], index) => (
          <div key={index} className="tw:flex tw:flex-col">
            ({email})
            <div>
              <span className="tw:font-medium">
                {formatFieldNameHumanReadable(key).replace("Notes", "")}
              </span>
              : {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
