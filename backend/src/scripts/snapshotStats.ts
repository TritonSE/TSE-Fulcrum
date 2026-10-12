// Computes dashboard stats for one recruitment year's database and saves them to the stats
// cluster (STATS_MONGODB_URL), so the dashboard can show that year after its cluster is shut down.
//
// Usage: npm run snapshot-stats -- <source MongoDB URL> [year]
//
// The year defaults to the only yearApplied found in the source database.
//
// TODO:
// This script uses the current commit to ingest application stats, regardless
// of year. As our application evolves, new pipelines are added, different stats
// are required, etc. We should work to decouple this from the current commit to 
// more accurately reflect application data over time.

import mongoose from "mongoose";

import env from "../env";
import {
  ApplicationModel,
  connectStatsSnapshots,
  ProgressModel,
  ReviewModel,
} from "../models";
import { StatsService } from "../services";
import { STATS_VERSION } from "../services/StatsService";
import { promptConfirmation } from "../utils";

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const main = async () => {
  const [sourceUrl, yearArg] = process.argv.slice(2);
  if (!sourceUrl) {
    fail("Usage: npm run snapshot-stats -- <source MongoDB URL> [year]");
  }
  if (!env.STATS_MONGODB_URL) {
    fail("STATS_MONGODB_URL is not set.");
  }
  if (sourceUrl === env.STATS_MONGODB_URL) {
    fail("The source database must not be the stats database.");
  }

  // Connect to the stats database
  const StatsSnapshotModel = await connectStatsSnapshots(env.STATS_MONGODB_URL);
  console.info("Connected to stats database");

  // Connect to the input database on the default connection, which the app's models use
  await mongoose.connect(sourceUrl);
  console.info("Connected to source database");

  // Check that the input database has the collections stats are computed from
  const collections = new Set(
    (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(
      (c) => c.name,
    ),
  );
  const missing = [ApplicationModel, ProgressModel, ReviewModel]
    .map((model) => model.collection.name)
    .filter((name) => !collections.has(name));
  if (missing.length > 0) {
    fail(`Source database is missing collections: ${missing.join(", ")}`);
  }

  // Determine the year
  let year: number;
  if (yearArg) {
    year = Number(yearArg);
    if (!Number.isInteger(year)) {
      fail(`Invalid year: ${yearArg}`);
    }
  } else {
    const years = (await ApplicationModel.distinct("yearApplied").exec()) as number[];
    if (years.length !== 1) {
      fail(
        // shouldn't ever happen since applications occur once per year in fall
        `Expected one yearApplied in the source database, found [${years.join(", ")}]`,
      );
    }
    year = years[0];
  }

  // compute snapshot
  const stats = await StatsService.computeStats(year);
  if (stats.totalApplicants === 0) {
    fail(`No applications found for ${year}.`);
  }
  console.info(
    `${year}: ${stats.totalApplicants} applicants, ${stats.scoresByStage.reduce(
      (sum, s) => sum + s.scores.length,
      0,
    )} stage scores`,
  );

  const existing = await StatsSnapshotModel.findOne({ year });
  if (existing) {
    const confirmed = promptConfirmation(
      `A snapshot for ${year} already exists (version ${existing.version}, current is ${STATS_VERSION}; computed ${existing.computedAt.toISOString()}). Overwrite it? (y/N): `,
    );
    if (!confirmed) {
      console.info("Snapshot cancelled.");
      process.exit(0);
    }
  }

  await StatsSnapshotModel.findOneAndUpdate(
    { year },
    { year, version: STATS_VERSION, computedAt: new Date(), stats },
    { upsert: true, runValidators: true },
  );
  console.info(`Saved stats snapshot for ${year}.`);

  await mongoose.disconnect();
  process.exit(0);
};

main().catch((error: unknown) => {
  console.error("Error creating stats snapshot:", error);
  process.exit(1);
});
