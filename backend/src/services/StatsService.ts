import { DateTime } from "luxon";

import { hearAboutOptions, pipelineIdentifiers } from "../config";
import { ApplicationModel, getStatsSnapshotModel, ProgressModel, ReviewModel } from "../models";

import ApplicationService from "./ApplicationService";
import ReviewService, { ReviewStatus } from "./ReviewService";
import StageService from "./StageService";

import type { PipelineIdentifier, Stage } from "../config";
import type { ProgressDocument, ReviewDocument } from "../models";

// Matches the score fields used by the stage applications table on the frontend.
const SCORE_REGEX = /^(?:.*_)?score$/;

const TIMEZONE = "America/Los_Angeles";

const knownHearAboutOptions = new Set(hearAboutOptions);

type FunnelStage = {
  stageId: number;
  stageName: string;
  reached: number;
  passed: number;
  rejected: number;
  pending: number;
};

// Bump this as stats struct changes
const STATS_VERSION = 1;
type Stats = {
  year: number;
  availableYears: number[];
  totalApplicants: number;
  byYear: { gradeLevel: string; count: number; transferCount: number }[];
  byPipeline: { pipelineIdentifier: PipelineIdentifier; count: number }[];
  byRoleCombo: { roles: PipelineIdentifier[]; count: number }[];
  // Split by role combination so the client can filter by role without double counting.
  applicationsByDay: { date: string; roles: PipelineIdentifier[]; count: number }[];
  applicationsByHour: { hour: string; roles: PipelineIdentifier[]; count: number }[];
  hearAbout: { source: string; count: number }[];
  scoresByStage: {
    stageId: number;
    stageName: string;
    pipelineIdentifier: PipelineIdentifier;
    maxScore: number | null;
    scores: number[];
  }[];
  funnel: {
    pipelineIdentifier: PipelineIdentifier;
    accepted: number;
    stages: FunnelStage[];
  }[];
};

function getScoreKeys(stage: Stage): string[] {
  return Object.keys(stage.fields)
    .filter((key) => SCORE_REGEX.test(key))
    .sort();
}

// Highest possible weighted score for a stage, or null if any score field has no known maximum.
function getMaxScore(stage: Stage): number | null {
  let total = 0;
  for (const key of getScoreKeys(stage)) {
    const field = stage.fields[key];
    const fieldMax =
      field.maxValue ??
      (field.choices.length > 0 && field.choices.every((c) => typeof c === "number")
        ? Math.max(...field.choices)
        : null);
    if (fieldMax === null) {
      return null;
    }
    total += fieldMax * (field.weight ?? 1);
  }
  return total;
}

// Average weighted score of one application's reviews for a stage.
// This deliberately mirrors the formula in the frontend's StageApplicationsView:
// only completed reviews contribute to the sum, but the denominator counts every
// review (including incomplete ones), so an application with no completed reviews
// scores 0.
function computeApplicationScore(stage: Stage, reviews: ReviewDocument[]): number {
  if (reviews.length === 0) {
    return 0;
  }

  const scoreKeys = getScoreKeys(stage);
  const total = reviews
    .filter((review) => ReviewService.getReviewStatus(review) === ReviewStatus.Completed)
    .map((review) =>
      scoreKeys
        .map((key) => {
          const value = review.fields.get(key);
          return typeof value === "number" ? value * (stage.fields[key].weight ?? 1) : 0;
        })
        .reduce((a, b) => a + b, 0),
    )
    .reduce((a, b) => a + b, 0);

  return total / reviews.length;
}

function countBy<T>(items: T[], getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function computeFunnel(progresses: ProgressDocument[]): Stats["funnel"] {
  return pipelineIdentifiers.map((pipelineIdentifier) => {
    const pipelineProgresses = progresses.filter(
      (p) => p.pipelineIdentifier === pipelineIdentifier,
    );

    const stages = StageService.getByPipeline(pipelineIdentifier).map((stage) => {
      const i = stage.pipelineIndex;
      const atStage = pipelineProgresses.filter((p) => p.stageIndex === i);
      return {
        stageId: stage.id,
        stageName: stage.name,
        reached: pipelineProgresses.filter((p) => p.stageIndex >= i).length,
        // Accepting at the final stage leaves stageIndex on that stage.
        passed: pipelineProgresses.filter(
          (p) => p.stageIndex > i || (p.stageIndex === i && p.state === "accepted"),
        ).length,
        rejected: atStage.filter((p) => p.state === "rejected").length,
        pending: atStage.filter((p) => p.state === "pending").length,
      };
    });

    return {
      pipelineIdentifier,
      accepted: pipelineProgresses.filter((p) => p.state === "accepted").length,
      stages,
    };
  });
}

class StatsService {
  // live stats for years in the current database; past years come from snapshots on the
  // stats cluster
  async getStats(year: number): Promise<Stats> {
    const snapshotModel = getStatsSnapshotModel();
    const [liveYears, snapshotYears] = await Promise.all([
      ApplicationModel.distinct("yearApplied").exec() as Promise<number[]>,
      snapshotModel ? (snapshotModel.distinct("year").exec() as Promise<number[]>) : [],
    ]);
    const availableYears = [...new Set([...liveYears, ...snapshotYears])].sort((a, b) => b - a);

    if (snapshotModel && !liveYears.includes(year)) {
      const snapshot = await snapshotModel.findOne({ year });
      if (snapshot) {
        return { ...snapshot.stats, availableYears };
      }
    }

    return { ...(await this.computeStats(year)), availableYears };
  }

  async computeStats(year: number): Promise<Omit<Stats, "availableYears">> {
    const applications = await ApplicationModel.find({ yearApplied: year });
    const applicationIds = applications.map((a) => a._id);
    const applicationsWithYear = applications.map((app) => {
      return ApplicationService.serialize(app);
    });

    const yearCounts = countBy(applicationsWithYear, (app) => app.applicantYear.toString());
    const transferYearCounts = countBy(
      applicationsWithYear.filter((app) => app.isTransfer),
      (app) => app.applicantYear.toString(),
    );

    const [progresses, reviews] = await Promise.all([
      ProgressModel.find({ application: { $in: applicationIds } }),
      ReviewModel.find(
        { application: { $in: applicationIds } },
        { stageId: 1, application: 1, fields: 1 },
      ),
    ]);

    const pipelineCounts = countBy(progresses, (p) => p.pipelineIdentifier);

    const progressesByApplication = groupBy(progresses, (p) => p.application.toHexString());
    const comboByApplication = new Map(
      [...progressesByApplication.entries()].map(([applicationId, appProgresses]) => [
        applicationId,
        appProgresses
          .map((p) => p.pipelineIdentifier)
          .sort()
          .join(","),
      ]),
    );
    const comboCounts = countBy([...comboByApplication.values()], (combo) => combo);

    const parseCombo = (combo: string) =>
      (combo === "" ? [] : combo.split(",")) as PipelineIdentifier[];

    // Keyed by "bucket|combo", where the bucket is the submission time in the given format
    const countByTimeAndCombo = (format: string) =>
      [
        ...countBy(
          applications,
          (a) =>
            `${DateTime.fromJSDate(a._id.getTimestamp()).setZone(TIMEZONE).toFormat(format)}|${
              comboByApplication.get(a._id.toHexString()) ?? ""
            }`,
        ).entries(),
      ]
        .map(([key, count]) => {
          const [bucket, combo] = key.split("|");
          return { bucket, roles: parseCombo(combo), count };
        })
        .sort((a, b) => a.bucket.localeCompare(b.bucket));

    // "Other" answers are stored as free text, which may contain anything, so group them.
    const hearAboutCounts = countBy(
      applications.flatMap((a) => a.hearAboutTSE),
      (source) => (knownHearAboutOptions.has(source) ? source : "Other"),
    );

    const reviewsByStage = groupBy(reviews, (r) => String(r.stageId));
    const scoresByStage = StageService.getAll()
      .filter((stage) => getScoreKeys(stage).length > 0)
      .map((stage) => {
        const byApplication = groupBy(reviewsByStage.get(String(stage.id)) ?? [], (r) =>
          r.application.toHexString(),
        );
        return {
          stageId: stage.id,
          stageName: stage.name,
          pipelineIdentifier: stage.pipelineIdentifier,
          maxScore: getMaxScore(stage),
          scores: [...byApplication.values()].map((appReviews) =>
            computeApplicationScore(stage, appReviews),
          ),
        };
      });

    return {
      year,
      totalApplicants: applications.length,
      byYear: Array.from(yearCounts, ([key, count]) => ({
        gradeLevel: key,
        count,
        transferCount: transferYearCounts.get(key) ?? 0,
      })),
      byPipeline: pipelineIdentifiers.map((pipelineIdentifier) => ({
        pipelineIdentifier,
        count: pipelineCounts.get(pipelineIdentifier) ?? 0,
      })),
      byRoleCombo: [...comboCounts.entries()]
        .map(([combo, count]) => ({ roles: parseCombo(combo), count }))
        .sort((a, b) => b.count - a.count),
      applicationsByDay: countByTimeAndCombo("yyyy-MM-dd").map(({ bucket, ...rest }) => ({
        date: bucket,
        ...rest,
      })),
      applicationsByHour: countByTimeAndCombo("yyyy-MM-dd'T'HH").map(({ bucket, ...rest }) => ({
        hour: bucket,
        ...rest,
      })),
      hearAbout: [...hearAboutCounts.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      scoresByStage,
      funnel: computeFunnel(progresses),
    };
  }
}

export { computeApplicationScore, Stats, STATS_VERSION };
export default new StatsService();
