import { PopulatedReview } from "../api";

import { toTitleCase } from "./application";

export enum ReviewStatus {
  NotStarted = "notStarted",
  InProgress = "inProgress",
  Completed = "completed",
}

// Used to sort reviews by status
export const reviewStatusNumericValues = {
  [ReviewStatus.NotStarted]: 0,
  [ReviewStatus.InProgress]: 1,
  [ReviewStatus.Completed]: 2,
};

export const reviewStatusColors = {
  [ReviewStatus.NotStarted]: "#ED8080",
  [ReviewStatus.InProgress]: "#CAB02D",
  [ReviewStatus.Completed]: "#44953C",
};

export const reviewStatusHumanReadableNames = {
  [ReviewStatus.NotStarted]: "Not Started",
  [ReviewStatus.InProgress]: "In Progress",
  [ReviewStatus.Completed]: "Completed",
};

export const getReviewStatus = (review: PopulatedReview) => {
  if (Object.keys(review.fields).length === 0) {
    return ReviewStatus.NotStarted;
  }
  // If any of the stage's fields are not present on the review, then it's not complete
  if (
    Object.keys(review.stage.fields).some((fieldName) => review.fields[fieldName] === undefined)
  ) {
    return ReviewStatus.InProgress;
  }
  return ReviewStatus.Completed;
};

export const getReviewStatusHumanReadable = (review: PopulatedReview) =>
  reviewStatusHumanReadableNames[getReviewStatus(review)] ?? "Unknown";

export const formatFieldNameHumanReadable = (fieldName: string) => {
  if (fieldName === "score" || fieldName === "rating") {
    return toTitleCase(fieldName);
  }
  const words = fieldName.split("_");

  return words
    .filter((word) => word !== "rating" && word !== "score")
    .map((word) => {
      if (word === "test") {
        return "TEST";
      }

      return toTitleCase(word);
    })
    .join(" ");
};
