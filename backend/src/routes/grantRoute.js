import express from "express";
import {
  revokeGrant,
  getResourceGrants,
} from "../controllers/grantController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/resource/:resourceId", protect, getResourceGrants);
router.patch("/:id/revoke", protect, revokeGrant);

export default router;
