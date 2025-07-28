import fs from "fs";
import path from "path";

import { Infer, array } from "caketype";
import mongoose from "mongoose";

import { CreateUserRequest } from "../cakes";
import env from "../env";
import { UserModel } from "../models";

// ConfigUser has the exact same shape as CreateUserRequest for now
// But keeping this alias in case they need to be decoupled in the future.
const ConfigUser = CreateUserRequest;
type ConfigUser = Infer<typeof ConfigUser>;

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

const upsertUser = async (user: ConfigUser) => {
  // First, try to find the existing user to compare changes
  const existingUser = await UserModel.findOne({ email: user.email });

  if (existingUser) {
    // Check if any fields have actually changed
    const hasChanges = Object.entries(user).some(([key, value]) => {
      return (
        JSON.stringify(existingUser[key as keyof typeof existingUser]) !== JSON.stringify(value)
      );
    });

    if (!hasChanges) return;
  }

  const updatedUser = await UserModel.findOneAndUpdate({ email: user.email }, user, {
    upsert: true,
    runValidators: true,
  });

  // updatedUser should never be null
  if (updatedUser?.isNew) {
    console.log(`Created new user: ${user.email}`);
  } else {
    console.log(`Updated user: ${user.email}`);
  }
};

const main = async () => {
  await mongoose.connect(env.MONGODB_URL);

  console.log("Connected to MongoDB");

  let configPath: string;

  if (process.argv.length > 2) {
    configPath = path.resolve(process.cwd(), process.argv[2]);
  } else {
    configPath = path.resolve(__dirname, "../config/users.json");
  }

  const users = loadConfig(configPath);

  await Promise.all(users.map(upsertUser))
    .then(() => {
      console.log("All users upserted successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error upserting users:", error);
      process.exit(1);
    });
};

void main();
