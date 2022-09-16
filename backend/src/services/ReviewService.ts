import { Types } from "mongoose";

import env from "../env";
import { ApplicationModel, Review, ReviewDocument, ReviewModel, StageDocument } from "../models";

import EmailService from "./EmailService";
import StageService from "./StageService";

class ReviewService {
  async create(stage: StageDocument, application: Types.ObjectId): Promise<ReviewDocument> {
    const reviewerEmail = stage.autoAssignReviewers
      ? await this.getAutoAssignedReviewer(stage, application)
      : null;

    const review = await new ReviewModel({
      stage,
      application,
      completed: false,
      fields: {},
      ...(reviewerEmail !== null ? { reviewerEmail } : {}),
    }).save();

    if (reviewerEmail !== null) {
      await this.sendAssignEmail(review);
    }

    return review;
  }

  async update(review: Review): Promise<ReviewDocument | string> {
    const existing = await ReviewModel.findById(review._id);
    if (existing === null) {
      return `No review with id: ${review._id}`;
    }

    if (existing.completed) {
      return `Cannot update completed review: ${review._id}`;
    }

    const existingEmail = existing.reviewerEmail;
    const newEmail = review.reviewerEmail;

    const reviewDocument = await ReviewModel.findOneAndReplace({ _id: review._id }, review, {
      returnDocument: "after",
    });
    if (reviewDocument === null) {
      // Shouldn't happen because we just queried for the old document.
      // This is mostly for TypeScript control flow analysis.
      return `Race condition: review with id deleted? ${review._id}`;
    }

    if (typeof newEmail === "string" && newEmail !== existingEmail) {
      // Review was assigned or reassigned.
      await this.sendAssignEmail(reviewDocument);
    }

    return reviewDocument;
  }

  private async sendAssignEmail(review: ReviewDocument): Promise<void> {
    if (typeof review.reviewerEmail !== "string") {
      throw new Error(`No reviewer assigned to review: ${review._id.toHexString()}`);
    }

    // TODO: more dependency cycle
    const application = await ApplicationModel.findById(review.application);
    const stage = await StageService.getById(review.stage);

    return EmailService.send({
      recipient: review.reviewerEmail,
      subject: `${stage?.name} for ${application?.name}`,
      body: `${env.DEPLOYMENT_URL}/review/${review._id.toHexString()}`,
    });
  }

  private async getAutoAssignedReviewer(
    stage: StageDocument,
    application: Types.ObjectId
  ): Promise<string | null> {
    let reviewerEmails = stage.reviewerEmails;
    if (reviewerEmails.length === 0) {
      console.error(
        `Cannot auto-assign reviewer because stage has no reviewers: ${stage._id.toHexString()}`
      );
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
        ReviewModel.count({ reviewerEmail }).then((count) => [count, reviewerEmail] as const)
      )
    );

    // Sort in descending order by count.
    countsAndEmails.sort((a, b) => b[0] - a[0]);

    // Get all reviewers who are tied for the maximum count.
    reviewerEmails = countsAndEmails
      .filter((pair) => pair[0] === countsAndEmails[0][0])
      .map((pair) => pair[1]);

    // Pick one of these reviewers at random.
    return reviewerEmails[Math.floor(Math.random() * reviewerEmails.length)];
  }

  async getByStageAndApplication(
    stage: Types.ObjectId,
    application: Types.ObjectId
  ): Promise<ReviewDocument[]> {
    return ReviewModel.find({ stage, application });
  }
}

export default new ReviewService();
