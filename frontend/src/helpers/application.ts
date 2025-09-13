import { Progress, Stage } from "../api";

export const APPLICANT_YEARS = [
  "1st",
  "2nd",
  "3rd / 1st transfer",
  "4th / 2nd transfer",
  "unknown",
] as const;

export type ApplicantYear = typeof APPLICANT_YEARS[number];

export const formatApplicantYear = (year: number): ApplicantYear => {
  console.log(year);
  switch (year) {
    case 1:
      return "1st";
    case 2:
      return "2nd";
    case 3:
      return "3rd / 1st transfer";
    case 4:
      return "4th / 2nd transfer";
    default:
      return "unknown";
  }
};

export const getApplicationStageStatus = (stage: Stage, progress: Progress) => {
  if (progress.stageIndex > stage.pipelineIndex || progress.state === "accepted") {
    // We only care about the application status at the current stage
    // This status is only used to determine who still needs to be advanced/rejected at each stage
    return "advanced";
  }
  return progress.state;
};

export const applicationStatusColors = {
  rejected: "#ED8080",
  pending: "#CAB02D",
  advanced: "#44953C",
};

export const toTitleCase = (text: string) => text[0].toUpperCase() + text.slice(1);

// Format phone number to (123) 456-7890
export const formatPhoneNumber = (phone: string) => {
  const cleaned = ("" + phone).replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }

  return phone;
};
