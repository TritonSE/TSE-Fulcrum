/* eslint-disable no-await-in-loop, @typescript-eslint/no-non-null-assertion */

import mongoose from "mongoose";

import { stages } from "src/config/stages";
import { ApplicationDocument, ApplicationModel } from "src/models/ApplicationModel";
import { Review, ReviewModel } from "src/models/ReviewModel";
import { UserDocument, UserModel } from "src/models/UserModel";
import ApplicationService from "src/services/ApplicationService";
import ReviewService, { ReviewStatus } from "src/services/ReviewService";

describe("ReviewService tests", () => {
  let users: UserDocument[] = [];
  let applications: ApplicationDocument[] = [];
  let resumeReviews: Review[][] = [];
  let phoneScreens: Review[] = [];
  let technicalInterviews: Review[] = [];

  const createTestApplication = async (year: number) => {
    const startYear = new Date().getFullYear() - year + 1;
    const application = await ApplicationModel.create({
      pronouns: "he/him",
      phone: "111-111-1111",
      yearApplied: new Date().getFullYear(),
      major: "Computer Science",
      majorDept: "CSE",
      hearAboutTSE: ["Word of Mouth"],
      prevTest: "none",
      resumeUrl: "myresume",
      aboutPrompt: "hi im a test applicant",
      interestPrompt: "i love tse!",
      testBarriersPrompt: "i have faced many hardships in my life",
      rolePrompts: {},
      name: `Applicant ${applications.length + 1}`,
      email: `applicant${applications.length + 1}@ucsd.edu`,
      startQuarter: ApplicationService.calculateQuarter("Fall", startYear),
      gradQuarter: ApplicationService.calculateQuarter("Spring", startYear + 4),
    });
    applications.push(application);

    resumeReviews.push([]);
    for (let i = 0; i < 2; i++) {
      const review = await ReviewModel.create({
        stageId: stages.find((stage) => stage.identifier === "developer_resume_review")!.id,
        application: application._id,
        fields: {},
      });
      resumeReviews[resumeReviews.length - 1].push(review);
    }
  };

  beforeEach(async () => {
    applications = [];
    resumeReviews = [];
    phoneScreens = [];
    technicalInterviews = [];

    // 9 first-years
    for (let i = 1; i <= 9; i++) {
      await createTestApplication(1);
    }

    // 4 2nd+ years
    await createTestApplication(4);
    await createTestApplication(2);
    await createTestApplication(3);
    await createTestApplication(4);

    const devStageIds = stages
      .filter((stage) =>
        ["developer_resume_review", "developer_phone_screen", "developer_technical"].includes(
          stage.identifier,
        ),
      )
      .map((stage) => stage.id);

    users = [
      // 2 reviewers reviewing only 1st years, paired together
      await UserModel.create({
        email: "reviewer1@ucsd.edu",
        name: "Reviewer 1",
        assignedStageIds: devStageIds,
        onlyFirstYearPhoneScreen: true,
        onlyFirstYearTechnical: true,
      }),

      await UserModel.create({
        email: "reviewer2@ucsd.edu",
        name: "Reviewer 2",
        assignedStageIds: devStageIds,
        onlyFirstYearPhoneScreen: true,
        onlyFirstYearTechnical: true,
      }),

      // A reviewer reviewing 1st years paired with a reviewer reviewing any year
      await UserModel.create({
        email: "reviewer3@ucsd.edu",
        name: "Reviewer 3",
        assignedStageIds: devStageIds,
        onlyFirstYearPhoneScreen: true,
        onlyFirstYearTechnical: true,
      }),
      await UserModel.create({
        email: "reviewer4@ucsd.edu",
        name: "Reviewer 4",
        assignedStageIds: devStageIds,
        onlyFirstYearPhoneScreen: false,
        onlyFirstYearTechnical: true,
      }),

      // 2 reviewers reviewing any year, paired together
      await UserModel.create({
        email: "reviewer5@ucsd.edu",
        name: "Reviewer 5",
        assignedStageIds: devStageIds,
        onlyFirstYearPhoneScreen: false,
        onlyFirstYearTechnical: false,
      }),
      await UserModel.create({
        email: "reviewer6@ucsd.edu",
        name: "Reviewer 6",
        assignedStageIds: devStageIds,
        onlyFirstYearPhoneScreen: false,
        onlyFirstYearTechnical: false,
      }),

      // A reviewer reviewing any year, doing reviews alone
      await UserModel.create({
        email: "reviewer7@ucsd.edu",
        name: "Reviewer 7",
        assignedStageIds: devStageIds,
        isDoingInterviewAlone: true,
        onlyFirstYearPhoneScreen: false,
        onlyFirstYearTechnical: false,
      }),
    ];
  });

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL!);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  describe("getReviewStatus", () => {
    it("Not started", async () => {
      const review = await ReviewModel.create({
        stageId: stages.find((stage) => stage.identifier === "developer_resume_review")!.id,
        application: new mongoose.Types.ObjectId("111111111111111111111111"),
        fields: {},
      });
      expect(ReviewService.getReviewStatus(review)).toBe(ReviewStatus.NotStarted);
    });

    it("In progress", async () => {
      const review = await ReviewModel.create({
        stageId: stages.find((stage) => stage.identifier === "developer_resume_review")!.id,
        application: new mongoose.Types.ObjectId("111111111111111111111111"),
        fields: {
          resume_score: 2,
        },
      });
      expect(ReviewService.getReviewStatus(review)).toBe(ReviewStatus.InProgress);
    });

    it("Completed", async () => {
      const review = await ReviewModel.create({
        stageId: stages.find((stage) => stage.identifier === "developer_resume_review")!.id,
        application: new mongoose.Types.ObjectId("111111111111111111111111"),
        fields: {
          resume_score: 2,
          blurb_score: 4,
        },
      });
      expect(ReviewService.getReviewStatus(review)).toBe(ReviewStatus.Completed);
    });
  });

  describe("assign/reassign", () => {
    it("Dev resume reviewers", async () => {
      await ReviewService.assign(resumeReviews[0][0]._id.toString(), "reviewer7@ucsd.edu");
      await ReviewService.assign(resumeReviews[0][1]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[1][0]._id.toString(), "reviewer3@ucsd.edu");
      await ReviewService.assign(resumeReviews[1][1]._id.toString(), "reviewer2@ucsd.edu");
      await ReviewService.assign(resumeReviews[2][0]._id.toString(), "reviewer6@ucsd.edu");
      await ReviewService.assign(resumeReviews[2][1]._id.toString(), "reviewer4@ucsd.edu");

      // Make sure that auto-assign distributes reviews evenly, to the only reviewer without any reviews
      await ReviewService.assign(resumeReviews[3][0]._id.toString(), null);
      expect((await ReviewModel.findById(resumeReviews[3][0]._id))!.reviewerEmail).toBe(
        "reviewer5@ucsd.edu",
      );

      // Reassign
      await ReviewService.reassign(resumeReviews[3][0]._id.toString());
      expect(
        (await ApplicationModel.findById(applications[3]._id))!.blockListedReviewerEmails,
      ).toEqual(["reviewer5@ucsd.edu"]);
      await ReviewService.reassign(resumeReviews[3][0]._id.toString());
      expect((await ReviewModel.findById(resumeReviews[3][0]._id))!.reviewerEmail).not.toBe(
        "reviewer5@ucsd.edu",
      );

      await ReviewService.assign(resumeReviews[3][1]._id.toString(), null);
      await ReviewService.assign(resumeReviews[4][0]._id.toString(), null);
      await ReviewService.assign(resumeReviews[4][1]._id.toString(), null);
      await ReviewService.assign(resumeReviews[5][0]._id.toString(), null);
      await ReviewService.assign(resumeReviews[5][1]._id.toString(), null);
      await ReviewService.assign(resumeReviews[6][0]._id.toString(), null);
      await ReviewService.assign(resumeReviews[6][1]._id.toString(), null);

      // Ensure reviews were distributed evenly over all reviewers
      for (const user of users) {
        expect(
          await ReviewModel.count({
            reviewerEmail: user.email,
            stageId: stages.find((stage) => stage.identifier === "developer_resume_review")!.id,
          }),
        ).toBe(2);
      }
    });

    it("Dev phone screens", async () => {
      for (const application of applications) {
        const review = await ReviewModel.create({
          stageId: stages.find((stage) => stage.identifier === "developer_phone_screen")!.id,
          application: application._id,
          fields: {},
        });
        phoneScreens.push(review);
        await ReviewService.assign(review._id.toString(), null);
      }

      // Ensure 1st vs non-1st years were distributed correctly
      const phoneScreenStageId = stages.find(
        (stage) => stage.identifier === "developer_phone_screen",
      )!.id;
      for (const user of users) {
        if (user.onlyFirstYearPhoneScreen) {
          expect(
            await ReviewModel.count({ reviewerEmail: user.email, stageId: phoneScreenStageId }),
          ).toBe(3);
        } else {
          expect(
            await ReviewModel.count({ reviewerEmail: user.email, stageId: phoneScreenStageId }),
          ).toBe(1);
        }
      }

      for (let i = 0; i < 9; i++) {
        expect(["reviewer1@ucsd.edu", "reviewer2@ucsd.edu", "reviewer3@ucsd.edu"]).toContain(
          (await ReviewModel.findById(phoneScreens[i]._id))!.reviewerEmail,
        );
      }

      for (let i = 9; i < 13; i++) {
        expect([
          "reviewer4@ucsd.edu",
          "reviewer5@ucsd.edu",
          "reviewer6@ucsd.edu",
          "reviewer7@ucsd.edu",
        ]).toContain((await ReviewModel.findById(phoneScreens[i]._id))!.reviewerEmail);
      }

      // Reassign
      const originalReviewerEmail = (await ReviewModel.findById(phoneScreens[3]._id))!
        .reviewerEmail;
      await ReviewService.reassign(phoneScreens[3]._id.toString());
      expect(
        (await ApplicationModel.findById(applications[3]._id))!.blockListedReviewerEmails,
      ).toEqual([originalReviewerEmail]);
      await ReviewService.reassign(phoneScreens[3]._id.toString());
      expect((await ReviewModel.findById(phoneScreens[3]._id))!.reviewerEmail).not.toBe(
        originalReviewerEmail,
      );
    });

    it("Dev technical interviews", async () => {
      for (const application of applications) {
        const review = await ReviewModel.create({
          stageId: stages.find((stage) => stage.identifier === "developer_technical")!.id,
          application: application._id,
          fields: {},
        });
        technicalInterviews.push(review);
        await ReviewService.assign(review._id.toString(), null);
      }

      // Ensure 1st vs non-1st years were distributed correctly
      const technicalStageId = stages.find(
        (stage) => stage.identifier === "developer_technical",
      )!.id;
      for (const user of users) {
        if (user.onlyFirstYearTechnical) {
          expect([2, 3]).toContain(
            await ReviewModel.count({ reviewerEmail: user.email, stageId: technicalStageId }),
          );
        }
      }

      // Solo interviewer should get 2 non-1st year interviews, while others should get 1 each
      expect(
        await ReviewModel.count({
          reviewerEmail: "reviewer5@ucsd.edu",
          stageId: technicalStageId,
        }),
      ).toBe(1);
      expect(
        await ReviewModel.count({
          reviewerEmail: "reviewer6@ucsd.edu",
          stageId: technicalStageId,
        }),
      ).toBe(1);
      expect(
        await ReviewModel.count({
          reviewerEmail: "reviewer7@ucsd.edu",
          stageId: technicalStageId,
        }),
      ).toBe(2);

      for (let i = 0; i < 9; i++) {
        expect([
          "reviewer1@ucsd.edu",
          "reviewer2@ucsd.edu",
          "reviewer3@ucsd.edu",
          "reviewer4@ucsd.edu",
        ]).toContain((await ReviewModel.findById(technicalInterviews[i]._id))!.reviewerEmail);
      }

      for (let i = 9; i < 13; i++) {
        expect(["reviewer5@ucsd.edu", "reviewer6@ucsd.edu", "reviewer7@ucsd.edu"]).toContain(
          (await ReviewModel.findById(technicalInterviews[i]._id))!.reviewerEmail,
        );
      }

      // Reassign
      const originalReviewerEmail = (await ReviewModel.findById(technicalInterviews[11]._id))!
        .reviewerEmail;
      await ReviewService.reassign(technicalInterviews[11]._id.toString());
      expect(
        (await ApplicationModel.findById(applications[11]._id))!.blockListedReviewerEmails,
      ).toEqual([originalReviewerEmail]);
      await ReviewService.reassign(technicalInterviews[11]._id.toString());
      expect((await ReviewModel.findById(technicalInterviews[11]._id))!.reviewerEmail).not.toBe(
        originalReviewerEmail,
      );
    });
  });

  describe("getNextReviewForUser", () => {
    it("No reviews assigned to user", async () => {
      await ReviewService.assign(resumeReviews[0][0]._id.toString(), "reviewer6@ucsd.edu");

      const nextReview = await ReviewService.getNextReviewForUser("reviewer1@ucsd.edu");
      expect(nextReview).toBe(null);
    });

    it("All reviews are not started", async () => {
      await ReviewService.assign(resumeReviews[0][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[1][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[2][0]._id.toString(), "reviewer1@ucsd.edu");

      const nextReview = await ReviewService.getNextReviewForUser("reviewer1@ucsd.edu");
      expect([
        resumeReviews[0][0]._id.toString(),
        resumeReviews[1][0]._id.toString(),
        resumeReviews[2][0]._id.toString(),
      ]).toContain(nextReview!._id.toString());
    });

    it("Mix of not started, in progress, and completed reviews", async () => {
      await ReviewService.assign(resumeReviews[0][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[1][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[2][0]._id.toString(), "reviewer1@ucsd.edu");

      await ReviewModel.findByIdAndUpdate(resumeReviews[0][0]._id, {
        fields: {
          resume_score: 2,
          blurb_score: 4,
        },
      });
      await ReviewModel.findByIdAndUpdate(resumeReviews[1][0]._id, {
        fields: {
          resume_score: 2,
        },
      });

      const nextReview = await ReviewService.getNextReviewForUser("reviewer1@ucsd.edu");
      expect(nextReview!._id.toString()).toBe(resumeReviews[2][0]._id.toString());
    });

    it("Only in progress and completed reviews", async () => {
      await ReviewService.assign(resumeReviews[0][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[1][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[2][0]._id.toString(), "reviewer1@ucsd.edu");

      await ReviewModel.findByIdAndUpdate(resumeReviews[0][0]._id, {
        fields: {
          resume_score: 2,
          blurb_score: 4,
        },
      });
      await ReviewModel.findByIdAndUpdate(resumeReviews[1][0]._id, {
        fields: {
          resume_score: 2,
        },
      });
      await ReviewModel.findByIdAndUpdate(resumeReviews[2][0]._id, {
        fields: {
          resume_score: 2,
          blurb_score: 3,
        },
      });

      const nextReview = await ReviewService.getNextReviewForUser("reviewer1@ucsd.edu");
      expect(nextReview!._id.toString()).toBe(resumeReviews[1][0]._id.toString());
    });

    it("All reviews are completed", async () => {
      await ReviewService.assign(resumeReviews[0][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[1][0]._id.toString(), "reviewer1@ucsd.edu");
      await ReviewService.assign(resumeReviews[2][0]._id.toString(), "reviewer1@ucsd.edu");

      await ReviewModel.findByIdAndUpdate(resumeReviews[0][0]._id, {
        fields: {
          resume_score: 2,
          blurb_score: 4,
        },
      });
      await ReviewModel.findByIdAndUpdate(resumeReviews[1][0]._id, {
        fields: {
          resume_score: 2,
          blurb_score: 1,
        },
      });
      await ReviewModel.findByIdAndUpdate(resumeReviews[2][0]._id, {
        fields: {
          resume_score: 2,
          blurb_score: 3,
        },
      });

      const nextReview = await ReviewService.getNextReviewForUser("reviewer1@ucsd.edu");
      expect(nextReview).toBe(null);
    });
  });
});
