import mongoose from "mongoose";
import { stages } from "src/config/stages";
import { ApplicationModel } from "src/models/ApplicationModel";
import { ProgressModel } from "src/models/ProgressModel";
import { ReviewModel } from "src/models/ReviewModel";
import { connectStatsSnapshots } from "src/models/StatsSnapshotModel";
import StatsService, { computeApplicationScore, STATS_VERSION } from "src/services/StatsService";

import type { PipelineIdentifier, StageIdentifier } from "src/config";
import type { Progress } from "src/models/ProgressModel";

const getStage = (identifier: StageIdentifier) =>
  stages.find((stage) => stage.identifier === identifier)!;

const devResume = getStage("developer_resume_review");
const designerPhone = getStage("designer_phone_screen");

const currentYear = new Date().getFullYear();

let applicationCount = 0;

const createApplication = async (
  hearAboutTSE: string[] = ["Word of mouth"],
  year = currentYear,
) => {
  applicationCount++;
  return ApplicationModel.create({
    name: `Applicant ${applicationCount}`,
    pronouns: "they/them",
    email: `applicant${applicationCount}@ucsd.edu`,
    phone: "111-111-1111",
    yearApplied: year,
    startQuarter: 8100,
    gradQuarter: 8116,
    major: "Computer Science",
    majorDept: "CSE",
    hearAboutTSE,
    prevTest: "none",
    resumeUrl: "myresume",
    aboutPrompt: "about",
    interestPrompt: "interest",
    testBarriersPrompt: "N/A",
    rolePrompts: {},
  });
};

const createProgress = async (
  application: mongoose.Types.ObjectId,
  pipelineIdentifier: PipelineIdentifier,
  stageIndex = 0,
  state: Progress["state"] = "pending",
) => ProgressModel.create({ application, pipelineIdentifier, stageIndex, state });

const createReview = async (
  stageId: number,
  application: mongoose.Types.ObjectId,
  fields: Record<string, string | number> = {},
) => ReviewModel.create({ stageId, application, fields });

describe("statsService tests", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL!, { dbName: "stats-service-test" });
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("computeApplicationScore", () => {
    const appId = new mongoose.Types.ObjectId();

    it("applies field weights", async () => {
      const review = await createReview(designerPhone.id, appId, {
        general_score: 10,
        grade_score: 5,
        notes: "",
      });
      expect(computeApplicationScore(designerPhone, [review])).toBeCloseTo(10 * 0.4 + 5 * 0.6);
    });

    it("counts incomplete reviews in the denominator", async () => {
      const complete = await createReview(devResume.id, appId, { resume_score: 4, blurb_score: 2 });
      const incomplete = await createReview(devResume.id, appId, { resume_score: 5 });
      expect(computeApplicationScore(devResume, [complete, incomplete])).toBe(3);
    });

    it("scores 0 when no reviews are complete", async () => {
      const review = await createReview(devResume.id, appId);
      expect(computeApplicationScore(devResume, [review])).toBe(0);
    });
  });

  describe("getStats", () => {
    it("counts applicants by pipeline and role combination", async () => {
      const devOnly = await createApplication();
      const designerOnly = await createApplication();
      const both = await createApplication();
      await createProgress(devOnly._id, "developer");
      await createProgress(designerOnly._id, "designer");
      await createProgress(both._id, "developer");
      await createProgress(both._id, "designer");

      const stats = await StatsService.getStats(currentYear);

      expect(stats.totalApplicants).toBe(3);
      expect(stats.byPipeline).toEqual(
        expect.arrayContaining([
          { pipelineIdentifier: "developer", count: 2 },
          { pipelineIdentifier: "designer", count: 2 },
          { pipelineIdentifier: "test_developer", count: 0 },
        ]),
      );
      expect(stats.byRoleCombo).toHaveLength(3);
      expect(stats.byRoleCombo).toEqual(
        expect.arrayContaining([
          { roles: ["developer"], count: 1 },
          { roles: ["designer"], count: 1 },
          { roles: ["designer", "developer"], count: 1 },
        ]),
      );
    });

    it("splits applications per day by role combination", async () => {
      const devOnly = await createApplication();
      const both = await createApplication();
      const alsoDevOnly = await createApplication();
      await createProgress(devOnly._id, "developer");
      await createProgress(both._id, "developer");
      await createProgress(both._id, "designer");
      await createProgress(alsoDevOnly._id, "developer");

      const stats = await StatsService.getStats(currentYear);

      // All created just now, so they share a date
      expect(new Set(stats.applicationsByDay.map((d) => d.date)).size).toBe(1);
      expect(stats.applicationsByDay.map(({ roles, count }) => ({ roles, count }))).toEqual(
        expect.arrayContaining([
          { roles: ["developer"], count: 2 },
          { roles: ["designer", "developer"], count: 1 },
        ]),
      );
      expect(stats.applicationsByDay).toHaveLength(2);
    });

    it("splits applications per hour by role combination", async () => {
      const devOnly = await createApplication();
      const designerOnly = await createApplication();
      await createProgress(devOnly._id, "developer");
      await createProgress(designerOnly._id, "designer");

      const stats = await StatsService.getStats(currentYear);

      for (const { hour } of stats.applicationsByHour) {
        expect(hour).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}$/);
      }
      const total = (entries: { count: number }[]) => entries.reduce((sum, e) => sum + e.count, 0);
      expect(total(stats.applicationsByHour)).toBe(2);
      // Every hour bucket falls on one of the day buckets
      const dates = new Set(stats.applicationsByDay.map((d) => d.date));
      expect(stats.applicationsByHour.every(({ hour }) => dates.has(hour.slice(0, 10)))).toBe(true);
    });

    it("counts hear-about sources with multiple selections", async () => {
      await createApplication(["Instagram", "Word of mouth"]);
      await createApplication(["Instagram"]);

      const stats = await StatsService.getStats(currentYear);

      expect(stats.hearAbout).toEqual([
        { source: "Instagram", count: 2 },
        { source: "Word of mouth", count: 1 },
      ]);
    });

    it("groups free-text hear-about answers as Other", async () => {
      await createApplication(["Instagram", "my friend Jane Doe (555-0100)"]);
      await createApplication(["a Discord server"]);

      const stats = await StatsService.getStats(currentYear);

      expect(stats.hearAbout).toEqual([
        { source: "Other", count: 2 },
        { source: "Instagram", count: 1 },
      ]);
    });

    it("computes the funnel from progress state", async () => {
      const apps = await Promise.all([1, 2, 3, 4, 5].map(async () => createApplication()));
      await createProgress(apps[0]._id, "developer", 0, "pending");
      await createProgress(apps[1]._id, "developer", 0, "rejected");
      await createProgress(apps[2]._id, "developer", 1, "pending");
      await createProgress(apps[3]._id, "developer", 2, "rejected");
      // Accepted at the final stage keeps stageIndex on that stage
      await createProgress(apps[4]._id, "developer", 2, "accepted");

      const stats = await StatsService.getStats(currentYear);
      const dev = stats.funnel.find((f) => f.pipelineIdentifier === "developer")!;

      expect(dev.accepted).toBe(1);
      expect(
        dev.stages.map(({ reached, passed, rejected, pending }) => ({
          reached,
          passed,
          rejected,
          pending,
        })),
      ).toEqual([
        { reached: 5, passed: 3, rejected: 1, pending: 1 },
        { reached: 3, passed: 2, rejected: 0, pending: 1 },
        { reached: 2, passed: 1, rejected: 1, pending: 0 },
      ]);
    });

    it("includes one score per application per scored stage", async () => {
      const a = await createApplication();
      const b = await createApplication();
      await createReview(devResume.id, a._id, { resume_score: 4, blurb_score: 2 });
      await createReview(devResume.id, a._id, { resume_score: 2, blurb_score: 2 });
      await createReview(devResume.id, b._id);
      await createReview(devResume.id, b._id);

      const stats = await StatsService.getStats(currentYear);
      const resumeScores = stats.scoresByStage.find((s) => s.stageId === devResume.id)!;

      expect(resumeScores.maxScore).toBe(9);
      expect(resumeScores.scores.sort()).toEqual([0, 5]);
    });

    it("only includes applications from the requested year", async () => {
      const thisYear = await createApplication(["Instagram"]);
      const lastYear = await createApplication(["LinkedIn"], currentYear - 1);
      await createProgress(thisYear._id, "developer");
      await createProgress(lastYear._id, "designer");

      const stats = await StatsService.getStats(currentYear);

      expect(stats.totalApplicants).toBe(1);
      expect(stats.hearAbout).toEqual([{ source: "Instagram", count: 1 }]);
      expect(stats.byRoleCombo).toEqual([{ roles: ["developer"], count: 1 }]);
      expect(stats.availableYears).toEqual([currentYear, currentYear - 1]);
    });
  });

  describe("snapshots", () => {
    const snapshotYear = currentYear - 3;
    let StatsSnapshotModel: Awaited<ReturnType<typeof connectStatsSnapshots>>;

    beforeAll(async () => {
      StatsSnapshotModel = await connectStatsSnapshots(process.env.MONGO_URL!, {
        dbName: "stats-snapshots-test",
      });
    });

    afterEach(async () => {
      await StatsSnapshotModel.deleteMany({});
    });

    afterAll(async () => {
      await StatsSnapshotModel.db.close();
    });

    const saveSnapshot = async (year: number) => {
      const stats = await StatsService.computeStats(year);
      await StatsSnapshotModel.create({
        year,
        version: STATS_VERSION,
        computedAt: new Date(),
        stats: { ...stats, totalApplicants: 42 },
      });
    };

    it("serves past years from snapshots", async () => {
      await createApplication();
      await saveSnapshot(snapshotYear);

      const stats = await StatsService.getStats(snapshotYear);

      expect(stats.year).toBe(snapshotYear);
      expect(stats.totalApplicants).toBe(42);
      expect(stats.availableYears).toEqual([currentYear, snapshotYear]);
    });

    it("prefers live data for years in the current database", async () => {
      await createApplication();
      await saveSnapshot(currentYear);

      const stats = await StatsService.getStats(currentYear);

      expect(stats.totalApplicants).toBe(1);
      expect(stats.availableYears).toEqual([currentYear]);
    });
  });
});
