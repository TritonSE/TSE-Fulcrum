import http from "http";
import path from "path";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";

import env from "./env";
import routes from "./routes";
import { InterviewService, UserService } from "./services";

async function onStartup() {
  // Create the admin account if necessary.
  const admin = await UserService.create({
    email: env.ADMIN_EMAIL,
    name: "Admin",
  });
  if (admin !== null) {
    console.log("Created admin user");
  }
}

async function main() {
  await mongoose.connect(env.MONGODB_URL);
  console.log("Connected to database");

  await onStartup();

  const app = express();
  app.use(cors());

  app.use(morgan("combined"));
  app.use(bodyParser.json());
  app.use(cookieParser());

  app.use("/api", routes);

  // Serve static files.
  app.use(express.static(path.join(__dirname, "../public/")));

  // Serve index.html for routes that don't match files, to enable client-side routing.
  app.get("*", (_, res) => {
    res.sendFile("index.html", { root: path.join(__dirname, "../public/") });
  });

  const server = http.createServer(app);
  InterviewService.create(server);
  server.listen(env.PORT, () => {
    console.log(`Listening on port ${env.PORT}`);
  });
}

main().catch(console.error);
