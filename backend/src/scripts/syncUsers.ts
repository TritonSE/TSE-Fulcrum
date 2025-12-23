/* eslint-disable no-await-in-loop */
import fs from "node:fs";
import path from "node:path";

import { array } from "caketype";
import mongoose from "mongoose";

import { CreateUserRequest } from "../cakes";
import env from "../env";
import { UserModel } from "../models";
import { promptConfirmation } from "../utils";

import type { Infer } from "caketype";

// ConfigUser has the exact same shape as CreateUserRequest for now
// But keeping this alias in case they need to be decoupled in the future.
const ConfigUser = CreateUserRequest;
// eslint-disable-next-line ts/no-redeclare
type ConfigUser = Infer<typeof ConfigUser>;

type SyncPlan = {
  toCreate: ConfigUser[];
  toUpdate: { email: string; changes: Record<string, { old: unknown; new: unknown }> }[];
  toDelete: { email: string; name: string }[];
};

const loadConfig = (filePath: string): ConfigUser[] => {
  if (!fs.existsSync(filePath)) {
    console.error(`Configuration file not found: ${filePath}`);
    process.exit(1);
  }

  const configJSON = array(ConfigUser).check(JSON.parse(fs.readFileSync(filePath, "utf-8")));

  if (!configJSON.ok) {
    console.error("Invalid configuration format:", configJSON.error.toString());
    process.exit(1);
  }

  return configJSON.value;
};

const planSync = async (configUsers: ConfigUser[]): Promise<SyncPlan> => {
  const configEmailSet = new Set(configUsers.map((u) => u.email));
  const dbUsers = await UserModel.find();

  const toCreate: ConfigUser[] = [];
  const toUpdate: SyncPlan["toUpdate"] = [];
  const toDelete: SyncPlan["toDelete"] = [];

  // users to create or update
  for (const configUser of configUsers) {
    const existingUser = dbUsers.find((u) => u.email === configUser.email);

    if (!existingUser) {
      toCreate.push(configUser);
    } else {
      // check for field changes
      const changes: Record<string, { old: unknown; new: unknown }> = {};

      for (const [key, value] of Object.entries(configUser)) {
        const existingValue = existingUser[key as keyof ConfigUser];
        if (JSON.stringify(existingValue) !== JSON.stringify(value)) {
          changes[key] = { old: existingValue, new: value };
        }
      }

      if (Object.keys(changes).length > 0) {
        toUpdate.push({ email: configUser.email, changes });
      }
    }
  }

  // users to delete
  for (const dbUser of dbUsers) {
    if (dbUser.email !== env.ADMIN_EMAIL && !configEmailSet.has(dbUser.email)) {
      toDelete.push({ email: dbUser.email, name: dbUser.name });
    }
  }

  return { toCreate, toUpdate, toDelete };
};

const printSyncPlan = (plan: SyncPlan): void => {
  console.info("\n=== Sync Plan ===\n");

  if (plan.toCreate.length === 0 && plan.toUpdate.length === 0 && plan.toDelete.length === 0) {
    console.info("No changes needed. Database is already in sync with the configuration.");
    return;
  }

  if (plan.toCreate.length > 0) {
    console.info(`Users to CREATE (${plan.toCreate.length}):`);
    for (const user of plan.toCreate) {
      console.info(`  + ${user.email} (${user.name})`);
    }
    console.info();
  }

  if (plan.toUpdate.length > 0) {
    console.info(`Users to UPDATE (${plan.toUpdate.length}):`);
    for (const { email, changes } of plan.toUpdate) {
      console.info(`  ~ ${email}`);
      for (const [field, { old, new: newVal }] of Object.entries(changes)) {
        console.info(`      ${field}: ${JSON.stringify(old)} → ${JSON.stringify(newVal)}`);
      }
    }
    console.info();
  }

  if (plan.toDelete.length > 0) {
    console.info(`Users to DELETE (${plan.toDelete.length}):`);
    for (const { email, name } of plan.toDelete) {
      console.info(`  - ${email} (${name})`);
    }
    console.info();
  }
};

const applySyncPlan = async (plan: SyncPlan, configUsers: ConfigUser[]): Promise<void> => {
  // create new users
  for (const user of plan.toCreate) {
    await UserModel.create(user);
    console.info(`Created user: ${user.email}`);
  }

  // Update existing users
  for (const { email } of plan.toUpdate) {
    const configUser = configUsers.find((u) => u.email === email);
    if (configUser) {
      await UserModel.findOneAndUpdate({ email }, configUser, { runValidators: true });
      console.info(`Updated user: ${email}`);
    }
  }

  // Delete users not in config
  for (const { email } of plan.toDelete) {
    await UserModel.deleteOne({ email });
    console.info(`Deleted user: ${email}`);
  }
};

const main = async () => {
  await mongoose.connect(env.MONGODB_URL);

  console.info("Connected to MongoDB");

  let configPath: string;

  if (process.argv.length > 2) {
    configPath = path.resolve(process.cwd(), process.argv[2]);
  } else {
    configPath = path.resolve(__dirname, "../config/users.json");
  }

  const configUsers = loadConfig(configPath);
  console.info(`Loaded ${configUsers.length} users from ${configPath}`);

  const plan = await planSync(configUsers);
  printSyncPlan(plan);

  if (plan.toCreate.length === 0 && plan.toUpdate.length === 0 && plan.toDelete.length === 0) {
    process.exit(0);
  }

  const confirmed = promptConfirmation("Do you want to apply these changes? (y/N): ");

  if (!confirmed) {
    console.info("Sync cancelled.");
    process.exit(0);
  }

  try {
    await applySyncPlan(plan, configUsers);
    console.info("\nAll changes applied successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error applying changes:", error);
    process.exit(1);
  }
};

void main();
