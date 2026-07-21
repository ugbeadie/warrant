import express from "express";
import {
  createPolicyRule,
  getResourcePolicyRules,
  updatePolicyRule,
  deletePolicyRule,
} from "../controllers/policyRuleController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createPolicyRule);
router.get("/resource/:resourceId", protect, getResourcePolicyRules);
router.patch("/:id", protect, updatePolicyRule);
router.delete("/:id", protect, deletePolicyRule);

export default router;
