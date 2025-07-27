import fs from "fs";
import path from "path";

import { Infer, array, bake, boolean, number, string } from "caketype";
import mongoose from "mongoose";

import env from "../env";
import { UserModel } from "../models";
import { UserService } from "../services";

const ConfigUser = bake({
  email: string,
  name: string,
  onlyFirstYearPhoneScreen: boolean,
  onlyFirstYearTechnical: boolean,
  isDoingInterviewAlone: boolean,
  assignedStageIds: array(number),
});

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
  const existingUser = await UserModel.findOne({ email: user.email });

  if (existingUser) {
    // Check if any fields have actually changed
    const hasChanges = Object.entries(user).some(([key, value]) => {
      return (
        // hacky way to check if the value has changed since === can't compare arrays
        JSON.stringify(existingUser[key as keyof typeof existingUser]) !== JSON.stringify(value)
      );
    });

    if (!hasChanges) return;

    // Update existing user
    Object.assign(existingUser, user);
    await existingUser.save();

    console.log(`Updated user: ${user.email}`);
  } else {
    // Create new user
    const newUser = await UserService.create(user);

    // Shouldn't happen since already checked above
    if (!newUser) {
      console.error(`Failed to create user: ${user.email}. Email may already exist.`);
      return;
    }

    console.log(`Created new user: ${user.email}`);
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
    })
    .catch((error) => {
      console.error("Error upserting users:", error);
      process.exit(1);
    });
};

void main();
