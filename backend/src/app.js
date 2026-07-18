import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/prisma.js";
import authRoute from "./routes/authRoute.js";
import resourceRoute from "./routes/resourceRoute.js";
import groupRoute from "./routes/groupRoute.js";
import accessRequestRoute from "./routes/accessRequestRoute.js";
import policyRuleRoute from "./routes/policyRuleRoute.js";
import grantRoute from "./routes/grantRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import startExpiryJob from "./jobs/expiryJob.js";
import startUnusedAccessJob from "./jobs/unusedAccessJob.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

const PORT = process.env.PORT || 7001;

app.get("/", (req, res) => {
  res.send("running");
});

app.use("/api/auth", authRoute);
app.use("/api/resources", resourceRoute);
app.use("/api/groups", groupRoute);
app.use("/api/requests", accessRequestRoute);
app.use("/api/policy-rules", policyRuleRoute);
app.use("/api/grants", grantRoute);
app.use("/api/notifications", notificationRoute);

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL via Prisma");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startExpiryJob();
      startUnusedAccessJob();
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
