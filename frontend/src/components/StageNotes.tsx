import { PopulatedReview } from "../api";
import { formatFieldNameHumanReadable } from "../helpers/review";
import { useUsers } from "../hooks/users";

interface StageNotesProps {
  reviewsInStage: PopulatedReview[];
}

/* Lists notes from all reviewers */
export default function StageNotes({ reviewsInStage: reviews }: StageNotesProps) {
  const { emailsToUsers } = useUsers();

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
        {notesFields.map(([key, value, email]) => {
          const label = formatFieldNameHumanReadable(key).replace("Notes", "").trim();

          return (
            <div key={`${key}-${email}`} className="tw:flex tw:flex-col">
              ({emailsToUsers[email]?.name ?? "(unknown user)"})
              <div>
                <span className="tw:font-medium">{label === "" ? "General" : label}: </span>
                <span className="tw:whitespace-pre-line">{value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
