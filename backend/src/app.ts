import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";

import env from "./env";
import routes from "./routes";
import UserService from "./services/UserService";

async function onStartup() {
  // Create the admin account if necessary.
  await UserService.create({ email: env.ADMIN_EMAIL, name: "Admin" });
}

async function main() {
  await mongoose.connect(env.MONGODB_URL);
  console.log("Connected to database");

  await onStartup();

  const app = express();
  app.use(morgan("combined"));
  app.use(bodyParser.json());
  app.use(cookieParser());

  app.use("/api", routes);

  app.listen(env.PORT, () => {
    console.log(`Listening on port ${env.PORT}`);
  });
}

main().catch(console.error);
