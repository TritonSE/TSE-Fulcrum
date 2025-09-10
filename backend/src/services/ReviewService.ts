import { Types } from "mongoose";

import { Stage, StageIdentifier } from "../config";
import env from "../env";
import {
  ApplicationDocument,
  ApplicationModel,
  RawReview,
  ReviewDocument,
  ReviewModel,
  UserDocument,
} from "../models";
import { retrieveDeploymentUrl } from "../storage";

import ApplicationService from "./ApplicationService";
import EmailService from "./EmailService";
import StageService from "./StageService";
import UserService from "./UserService";

export enum ReviewStatus {
  NotStarted = "notStarted",
  InProgress = "inProgress",
  Completed = "completed",
}

class ReviewService {
  async create(stage: Stage, application: Types.ObjectId): Promise<ReviewDocument> {
    const review = await new ReviewModel({
      stageId: stage.id,
      application,
      fields: {},
    }).save();

    if (!stage.autoAssignReviewers) {
      return review;
    }

    const result = await this.assign(review._id.toHexString(), null);
    if (typeof result === "string") {
      // Failed to auto-assign, but application still created successfully.
      console.error(
        `Failed to auto-assign reviewer when creating review ${review._id.toHexString()}: ${result}`,
      );
      return review;
    }
    // Review updated with reviewer email.
    return result;
  }

  async assign(id: string, reviewerEmail: string | null): Promise<ReviewDocument | string> {
    const review = await ReviewModel.findById(id);
    if (review === null) {
      return "Review not found";
    }

    const stage = StageService.getById(review.stageId);
    if (stage === null) {
      return "Stage missing - this shouldn't happen";
    }

    if (reviewerEmail === null) {
      reviewerEmail = await this.getAutoAssignedReviewer(stage, review.application);
    }
    if (reviewerEmail === null) {
      return "Could not auto-assign reviewer";
    }

    const reviewer = await UserService.getByEmail(reviewerEmail);
    if (reviewer === null) {
      return "Reviewer email is invalid";
    }

    review.reviewerEmail = reviewerEmail;
    await review.save();

    if (stage.notifyReviewersWhenAssigned) {
      await this.sendAssignEmail(review);
    }
    return review;
  }

  async reassign(id: string, currentReviewerEmail: string): Promise<ReviewDocument | string> {
    const review = await ReviewModel.findById(id);
    if (review === null) {
      return "Review not found";
    }

    const applicationDoc = await ApplicationService.getById(review.application);
    if (!applicationDoc) {
      return "Application not found";
    }
    applicationDoc.blockListedReviewerEmails.push(currentReviewerEmail);
    await applicationDoc.save();

    review.reviewerEmail = undefined;
    await review.save();

    const stage = StageService.getById(review.stageId);
    if (stage === null) {
      return "Stage missing - this shouldn't happen";
    }

    const newReviewerEmail = await this.getAutoAssignedReviewer(stage, review.application);
    if (newReviewerEmail === null) {
      return "Could not auto-assign reviewer";
    }

    const reviewer = await UserService.getByEmail(newReviewerEmail);
    if (reviewer === null) {
      return "Reviewer email is invalid";
    }

    review.reviewerEmail = newReviewerEmail;
    await review.save();

    if (stage.notifyReviewersWhenAssigned) {
      await this.sendAssignEmail(review);
    }
    return review;
  }

  async update(review: RawReview): Promise<ReviewDocument | string> {
    const existing = await ReviewModel.findById(review._id);
    if (existing === null) {
      return `No review with id: ${review._id}`;
    }

    // TODO: enforce that only the assigned reviewer can change fields
    // TODO: validate fields against stage?

    const reviewDocument = await ReviewModel.findOneAndReplace({ _id: review._id }, review, {
      returnDocument: "after",
    });
    if (reviewDocument === null) {
      // Shouldn't happen because we just queried for the old document.
      // This is mostly for TypeScript control flow analysis.
      return `Race condition: review with id deleted? ${review._id}`;
    }

    // NOTE: we should send an email if reviewerEmail changes and stage has notifications,
    // but for now, we assume all email changes are done through the assign() method

    return reviewDocument;
  }

  private shouldDisableAssignmentEmails() {
    const nowMs = new Date().getTime();
    const deadlineMs = env.APPLICATION_DEADLINE?.getTime();
    if (!deadlineMs) {
      return false;
    }

    const timeUntilDeadlineMs = deadlineMs - nowMs;
    // Convert hours to milliseconds
    const disableAssignmentEmailsMs = env.DISABLE_ASSIGNMENT_EMAILS_HOURS * 1000 * 60 * 60;
    return (
      !isNaN(env.DISABLE_ASSIGNMENT_EMAILS_HOURS) &&
      timeUntilDeadlineMs <= disableAssignmentEmailsMs
    );
  }

  private async sendAssignEmail(review: ReviewDocument): Promise<void> {
    if (typeof review.reviewerEmail !== "string") {
      throw new Error(`No reviewer assigned to review: ${review._id.toHexString()}`);
    }

    // Disable review assignment emails when it gets close to the application deadline because we receive a LOT
    // of last-minute applications (hundreds) and risk getting rate-limited by Gmail if we send both applicant confirmation
    // emails and reviewer assignment emails. We want to prioritize confirmation emails and avoid spamming reviewers with
    // assignment emails
    if (this.shouldDisableAssignmentEmails()) {
      console.log("Too close to application deadline, not sending assignment email");
      return;
    }

    // TODO: more dependency cycle
    const application = await ApplicationModel.findById(review.application);
    const stage = StageService.getById(review.stageId);

    await EmailService.send({
      recipient: review.reviewerEmail,
      subject: `${stage?.name} for ${application?.name}`,
      body: `${retrieveDeploymentUrl()}/review/${review._id.toHexString()}/edit`,
    });
  }

  private async getAutoAssignedReviewer(
    stage: Stage,
    application: Types.ObjectId,
  ): Promise<string | null> {
    const applicationDoc = await ApplicationService.getById(application);

    if (!applicationDoc) {
      return null;
    }

    let reviewers = await UserService.getByStage(stage.id);

    if (reviewers.length === 0) {
      console.error(`Cannot auto-assign reviewer because stage has no reviewers: ${stage.id}`);
      return null;
    }

    // Filter out block-listed reviewers
    reviewers = reviewers.filter((reviewer) => {
      const blockListedEmails = applicationDoc?.blockListedReviewerEmails ?? [];
      return !blockListedEmails.includes(reviewer.email);
    });

    // Filter out reviewers who have already reviewed this application
    const excludingPreviousReviewers = await Promise.all(
      reviewers.map(async (reviewer) => ({
        reviewer,
        hasReviewed:
          (await ReviewModel.findOne({ reviewerEmail: reviewer.email, application })) !== null,
      })),
    ).then((results) =>
      results.filter((result) => !result.hasReviewed).map((result) => result.reviewer),
    );

    if (excludingPreviousReviewers.length > 0) {
      reviewers = excludingPreviousReviewers;
    }

    const gradeLevel = this.determineApplicantGradeLevel(applicationDoc);

    // Define filters for each stage
    const stageFilters: Partial<Record<StageIdentifier, (reviewer: UserDocument) => boolean>> = {
      developer_phone_screen: (reviewer) =>
        gradeLevel === 1 ? reviewer.onlyFirstYearPhoneScreen : !reviewer.onlyFirstYearPhoneScreen,
      developer_technical: (reviewer) =>
        gradeLevel === 1 ? reviewer.onlyFirstYearTechnical : !reviewer.onlyFirstYearTechnical,
    };

    const stageFilter = stageFilters[stage.identifier];
    if (stageFilter) {
      const filteredReviewers = reviewers.filter(stageFilter);

      // Shouldn't happen if we manually balance reviewer year levels, but in case the filter removes all reviewers, undo the filter
      reviewers = filteredReviewers.length > 0 ? filteredReviewers : reviewers;
    }

    const countsAndEmails = await Promise.all(
      reviewers.map((reviewer) =>
        ReviewModel.count({ reviewerEmail: reviewer.email, stageId: stage.id }).then(
          // Double count for solo interviewers because interview buddies go to both people's interviews
          (count) => [reviewer.isDoingInterviewAlone ? count * 2 : count, reviewer.email] as const,
        ),
      ),
    );

    // Sort in ascending order by count.
    countsAndEmails.sort((a, b) => a[0] - b[0]);

    // Get all reviewers who are tied for the minimum count.
    const reviewerEmails = countsAndEmails
      .filter((pair) => pair[0] === countsAndEmails[0][0])
      .map((pair) => pair[1]);

    // Pick one of these reviewers at random.
    return reviewerEmails[Math.floor(Math.random() * reviewerEmails.length)];
  }

  async getByStageAndApplication(
    stageId: number,
    application: Types.ObjectId,
  ): Promise<ReviewDocument[]> {
    return ReviewModel.find({ stageId, application });
  }

  async getById(id: string | Types.ObjectId): Promise<ReviewDocument | null> {
    return ReviewModel.findById(id);
  }

  async getFiltered(filter: Record<string, string>): Promise<ReviewDocument[]> {
    const results = await ReviewModel.find(filter).populate("application");
    return results;
  }

  async getNextReviewForUser(userEmail: string): Promise<ReviewDocument | null> {
    // First, try to find a "Not Started" review (with no fields filled in)
    let result = await ReviewModel.findOne({
      $expr: {
        $eq: [{ $size: { $objectToArray: "$fields" } }, 0],
      },
      reviewerEmail: userEmail,
    });

    // If none are found, try to find an "In Progress" review
    if (result === null) {
      const reviewsForReviewer = await ReviewModel.find({ reviewerEmail: userEmail });
      result =
        reviewsForReviewer.find(
          (review) => this.getReviewStatus(review) === ReviewStatus.InProgress,
        ) ?? null;
    }

    return result;
  }

  getReviewStatus(review: ReviewDocument) {
    if (Object.keys(review.fields).length === 0) {
      return ReviewStatus.NotStarted;
    }
    const stage = StageService.getById(review.stageId);
    if (!stage) {
      throw new Error(`Stage with ID ${review.stageId} not found`);
    }

    // If any of the stage's fields are not present on the review, then it's not complete
    if (
      Object.keys(stage.fields).some(
        (fieldName) =>
          (review.fields as unknown as Map<string, string | number | boolean>).get(fieldName) ===
          undefined,
      )
    ) {
      return ReviewStatus.InProgress;
    }
    return ReviewStatus.Completed;
  }

  /* 1 - First year, 2 - Second year... */
  private determineApplicantGradeLevel(application: ApplicationDocument): number {
    const totalQuartersAtUCSD = this.calculateQuarterDiff(
      application.startQuarter,
      application.gradQuarter,
    );

    const now = new Date();

    // If it's currently summer, year level is rounded up to next fall
    // Shouldn't be relevant since we only receive applications in the fall
    const yearsSinceStart = Math.ceil(
      this.calculateQuarterDiff(
        application.startQuarter,
        now.getFullYear() * 4 + Math.floor(now.getMonth() / 3),
      ) / 3,
    );

    return totalQuartersAtUCSD < 9 ? yearsSinceStart + 2 : yearsSinceStart;
  }

  /* Helper function to calculate academic quarters between two encoded quarter values */
  private calculateQuarterDiff(startQuarter: number, endQuarter: number): number {
    if (endQuarter < startQuarter) return 0;
    const yearsBetween = Math.floor(endQuarter / 4) - Math.floor(startQuarter / 4);
    return endQuarter - startQuarter - yearsBetween + 1;
  }

  serialize(review: ReviewDocument) {
    return {
      _id: review._id.toHexString(),
      stageId: review.stageId,
      stage: StageService.getById(review.stageId),
      application: review.application.toJSON(),
      reviewerEmail: review.reviewerEmail,
      fields: review.fields,
    };
  }
}

export default new ReviewService();
