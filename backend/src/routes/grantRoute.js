import express from "express";
import {
  revokeGrant,
  getResourceGrants,
  deleteGrant,
} from "../controllers/grantController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/resource/:resourceId", protect, getResourceGrants);
router.patch("/:id/revoke", protect, revokeGrant);
router.delete("/:id", protect, deleteGrant);

export default router;
