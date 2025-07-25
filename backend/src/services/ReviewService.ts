import { Types } from "mongoose";

import { Stage } from "../config";
import env from "../env";
import { ApplicationModel, RawReview, ReviewDocument, ReviewModel } from "../models";

import EmailService from "./EmailService";
import StageService from "./StageService";
import UserService from "./UserService";

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

  private async sendAssignEmail(review: ReviewDocument): Promise<void> {
    if (typeof review.reviewerEmail !== "string") {
      throw new Error(`No reviewer assigned to review: ${review._id.toHexString()}`);
    }

    // TODO: more dependency cycle
    const application = await ApplicationModel.findById(review.application);
    const stage = StageService.getById(review.stageId);

    await EmailService.send({
      recipient: review.reviewerEmail,
      subject: `${stage?.name} for ${application?.name}`,
      body: `${env.DEPLOYMENT_URL}/review/${review._id.toHexString()}/edit`,
    });
  }

  private async getAutoAssignedReviewer(
    stage: Stage,
    application: Types.ObjectId,
  ): Promise<string | null> {
    // TODO: find all users assigned to review this stage
    let reviewerEmails: string[] = [];
    if (reviewerEmails.length === 0) {
      console.error(`Cannot auto-assign reviewer because stage has no reviewers: ${stage.id}`);
      return null;
    }

    const excludingPreviousReviewers = [];
    for (const reviewerEmail of reviewerEmails) {
      // eslint-disable-next-line no-await-in-loop
      if ((await ReviewModel.findOne({ reviewerEmail, application })) === null) {
        excludingPreviousReviewers.push(reviewerEmail);
      }
    }

    if (excludingPreviousReviewers.length > 0) {
      reviewerEmails = excludingPreviousReviewers;
    }

    // TODO: don't count applications in preceding years
    const countsAndEmails = await Promise.all(
      reviewerEmails.map((reviewerEmail) =>
        ReviewModel.count({ reviewerEmail, stageId: stage.id }).then(
          (count) => [count, reviewerEmail] as const,
        ),
      ),
    );

    // Sort in ascending order by count.
    countsAndEmails.sort((a, b) => a[0] - b[0]);

    // Get all reviewers who are tied for the minimum count.
    reviewerEmails = countsAndEmails
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
