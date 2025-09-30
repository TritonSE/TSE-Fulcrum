import http from "node:http";
import path from "node:path";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";

import env from "./env";
import routes from "./routes";
import { InterviewService, UserService } from "./services";
import { asyncLocalStorage } from "./storage";

import type { ApplicationLocalStorage } from "./storage";

async function onStartup() {
  // Create the admin account if necessary.
  const admin = await UserService.create({
    email: env.ADMIN_EMAIL,
    name: "Admin",
    isAdmin: true,
  });
  if (admin !== null) {
    console.info("Created admin user");
  }
}

async function main() {
  await mongoose.connect(env.MONGODB_URL);
  console.info("Connected to database");

  await onStartup();

  const app = express();
  app.use(cors());

  app.use(morgan("combined"));
  app.use(bodyParser.json());
  app.use(cookieParser());

  // Global middleware to provide context to all routes via async local storage
  app.use((req, _res, next) => {
    const deploymentUrl = req.get("origin") ?? `${req.protocol}://${req.get("host")}`;
    asyncLocalStorage.run({ deploymentUrl } as ApplicationLocalStorage, () => {
      // Runs next request handler inside a context where it can access the local storage context
      next();
    });
  });

  app.use("/api", routes);

  const staticRoot = path.join(__dirname, "../../public/");

  // Serve static files.
  app.use(express.static(staticRoot));

  // Serve index.html for routes that don't match files, to enable client-side routing.
  app.get("*", (_, res) => {
    res.sendFile("index.html", { root: staticRoot });
  });

  const server = http.createServer(app);
  InterviewService.create(server);
  server.listen(env.PORT, () => {
    console.info(`Listening on port ${env.PORT}`);
  });
}

main().catch(console.error);
