import express from "express";
import { runExpirySweep } from "../jobs/expiryJob.js";
import { runUnusedAccessSweep } from "../jobs/unusedAccessJob.js";

const router = express.Router();

const verifyScheduler = (req, res, next) => {
  if (req.headers["x-job-secret"] !== process.env.JOB_SECRET) {
    return res.status(403).send("forbidden");
  }
  next();
};

router.post("/expiry-sweep", verifyScheduler, async (req, res) => {
  await runExpirySweep();
  res.status(200).send("ok");
});

router.post("/unused-access-sweep", verifyScheduler, async (req, res) => {
  await runUnusedAccessSweep();
  res.status(200).send("ok");
});

export default router;
