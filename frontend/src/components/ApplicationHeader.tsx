import { Button } from "@tritonse/tse-constellation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";

import api from "../api";
import { formatApplicantYear, formatPhoneNumber } from "../helpers/application";
import { formatFieldNameHumanReadable } from "../helpers/review";
import { useAlerts } from "../hooks/alerts";
import { formatQuarter } from "../util";

import type { Application } from "../api";

function PromptDropdown({ title, content }: { title: string; content: string | undefined }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="tw:rounded-lg tw:overflow-hidden tw:border tw:border-teal-primary">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="tw:w-full tw:flex tw:items-center tw:justify-between tw:p-4 tw:bg-accent-light tw:text-left"
      >
        <h3 className="tw:!m-0 tw:!font-normal tw:!text-2xl tw:!text-teal-primary">{title}</h3>
        <ChevronDown
          className={twMerge("tw:transition-transform", isOpen ? "tw:rotate-180" : "")}
        />
      </button>
      {isOpen && (
        <div className="tw:p-4 tw:border-t tw:border-teal-primary tw:rounded-b-lg">
          <div className="tw:whitespace-pre-line">{content || "No response provided"}</div>
        </div>
      )}
    </div>
  );
}

type ApplicationHeaderProps = {
  applicationId: string;
  reassignReview?: () => void;
  showApplicationLink?: boolean;
};

const field = (name: string, value: string) => (
  <p className="tw:!m-0">
    <b>{name}</b>: {value}
  </p>
);

/* Displays information about the applicant, including a Reassign button if being used in the Review page */
export default function ApplicationHeader({
  applicationId,
  reassignReview,
  showApplicationLink,
}: ApplicationHeaderProps) {
  const [application, setApplication] = useState<Application>();
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api
      .getApplicationById(applicationId)
      .then((app) => {
        setApplication(app);
        document.title = app.name;
      })
      .catch(addAlert);
  }, []);

  const prompts = {
    "About Me": application?.aboutPrompt,
    "Why TSE": application?.interestPrompt,
    "TEST Barriers": application?.testBarriersPrompt,
    // Format role prompts as "Why [role]"
    ...Object.entries(application?.rolePrompts || {}).reduce(
      (acc, [key, value]) => {
        acc[`Why ${formatFieldNameHumanReadable(key)}`] = value;
        return acc;
      },
      {} as Record<string, string | undefined>,
    ),
  };

  return (
    <div className="tw:flex tw:flex-col tw:gap-7">
      <div className="tw:flex tw:items-center tw:gap-5">
        <h2 className="tw:!m-0 tw:!text-4xl tw:!font-normal">{application?.name}</h2>
        <span className="tw:text-xl">({application?.pronouns})</span>
        {reassignReview && (
          <Button
            onClick={reassignReview}
            className="tw:!py-2 tw:!px-2.5 tw:!rounded-lg tw:!bg-teal-secondary"
          >
            Reassign
          </Button>
        )}
      </div>
      <div className="tw:grid tw:grid-rows-5 tw:grid-flow-col tw:w-fit tw:gap-x-30 tw:gap-y-2 tw:!text-lg">
        {field("ID", application?._id || "")}
        {field("Major", `${application?.major} (${application?.majorDept})`)}
        {field("Year", formatApplicantYear(application?.applicantYear || 0))}
        {field("Start Date", formatQuarter(application?.startQuarter || 0))}
        {field("Grad Date", formatQuarter(application?.gradQuarter || 0))}
        {field("Phone", formatPhoneNumber(application?.phone || ""))}
        {field("Email", application?.email || "")}
        {field(
          "Previously in TEST",
          application?.prevTest && application?.prevTest !== "none"
            ? formatFieldNameHumanReadable(application?.prevTest)
            : "No",
        )}
        <a href={application?.resumeUrl} target="_blank" rel="noreferrer noopener">
          Resume
        </a>
        {showApplicationLink && (
          <Link to={`/application/${application?._id}`}>View Application</Link>
        )}
      </div>
      <div className="tw:flex tw:flex-col tw:gap-8">
        {Object.entries(prompts).map(([key, response]) => {
          // Don't display test barriers prompt if the applicant is not applying for a TEST role
          if (
            key === "TEST Barriers" &&
            !application?.rolePrompts.test_designer &&
            !application?.rolePrompts.test_developer
          ) {
            return null;
          }

          return <PromptDropdown key={key} title={key} content={response} />;
        })}
      </div>
      {alerts}
    </div>
  );
}
