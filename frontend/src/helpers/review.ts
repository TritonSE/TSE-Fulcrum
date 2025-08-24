import { PopulatedReview } from "../api";

export enum ReviewStatus {
  NotStarted = "notStarted",
  InProgress = "inProgress",
  Completed = "completed",
}

export const getReviewStatus = (review: PopulatedReview) => {
  if (Object.keys(review.fields).length === 0) {
    return ReviewStatus.NotStarted;
  }
  // If any of the stage's fields are not present on the review, then it's not complete
  if (Object.keys(review.stage.fields).some((fieldName) => !review.fields[fieldName])) {
    return ReviewStatus.InProgress;
  }
  return ReviewStatus.Completed;
};

export const getReviewStatusHumanReadable = (review: PopulatedReview) => {
  switch (getReviewStatus(review)) {
    case ReviewStatus.NotStarted:
      return "Not Started";
    case ReviewStatus.InProgress:
      return "In Progress";
    case ReviewStatus.Completed:
      return "Completed";
    default:
      return "Unknown";
  }
};
