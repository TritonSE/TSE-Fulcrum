import mongoose, { Schema } from "mongoose";

import type { Stats } from "../services/StatsService";
import type { ConnectOptions, Model } from "mongoose";

type StatsSnapshot = {
  year: number;
  version: number;
  computedAt: Date;
  stats: Omit<Stats, "availableYears">;
};

const StatsSnapshotSchema = new Schema<StatsSnapshot>(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
    },
    version: {
      type: Number,
      required: true,
    },
    computedAt: {
      type: Date,
      required: true,
    },
    stats: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { minimize: false },
);

let statsSnapshotModel: Model<StatsSnapshot> | null = null;

// Opens a separate connection to the stats cluster
async function connectStatsSnapshots(
  url: string,
  options?: ConnectOptions,
): Promise<Model<StatsSnapshot>> {
  const connection = await mongoose.createConnection(url, options).asPromise();
  statsSnapshotModel = connection.model("StatsSnapshot", StatsSnapshotSchema);
  return statsSnapshotModel;
}

function getStatsSnapshotModel(): Model<StatsSnapshot> | null {
  return statsSnapshotModel;
}

export { connectStatsSnapshots, getStatsSnapshotModel, StatsSnapshot };
