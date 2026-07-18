import express from "express";
import {
  createPolicyRule,
  getResourcePolicyRules,
  deletePolicyRule,
} from "../controllers/policyRuleController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createPolicyRule);
router.get("/resource/:resourceId", protect, getResourcePolicyRules);
router.delete("/:id", protect, deletePolicyRule);

export default router;
