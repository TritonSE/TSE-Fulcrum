import { Link } from "react-router-dom";

import { Application } from "../api";

interface ApplicantInfoCellProps {
  application: Application;
  linkDestination: string;
}

/**
 * A table cell that renders an applicant's name, with a link to the given destination,
 * pronouns, and email.
 */
export function ApplicantInfoCell({ application, linkDestination }: ApplicantInfoCellProps) {
  return (
    <div className="tw:flex tw:flex-col tw:whitespace-nowrap">
      <div className="tw:flex tw:flex-row tw:gap-x-2">
        <Link to={linkDestination} className="tw:text-link tw:underline">
          {application.name}
        </Link>
        <p className="tw:!mb-2">({application.pronouns})</p>
      </div>
      <p className="tw:!mb-0">{application.email}</p>
    </div>
  );
}
