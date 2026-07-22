import express from "express";
import {
  revokeGrant,
  getResourceGrants,
  deleteGrant,
  getMyGrants,
  surrenderGrant,
} from "../controllers/grantController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/resource/:resourceId", protect, getResourceGrants);
router.patch("/:id/revoke", protect, revokeGrant);
router.delete("/:id", protect, deleteGrant);
router.get("/mine", protect, getMyGrants);
router.patch("/:id/surrender", protect, surrenderGrant);

export default router;
